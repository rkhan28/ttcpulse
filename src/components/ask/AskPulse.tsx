"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, ArrowUp, Send, RefreshCw, ExternalLink } from "lucide-react";
import { PROMPTS, ChatMsg, ArrivalCard } from "@/lib/data";
import { useLiveBoard, useAlerts } from "@/lib/hooks";

const sevLabel = (s: string) => (s === "major" ? "Major" : s === "minor" ? "Minor" : "Info");
const sevBg = (s: string) => `rgba(${s === "major" ? "220,38,38" : s === "minor" ? "245,158,11" : "37,99,235"},.14)`;

export default function AskPulse() {
  const board = useLiveBoard();
  const { alerts, refresh, refreshing } = useAlerts();
  const [chat, setChat] = useState<ChatMsg[]>([
    { role: "assistant", text: "Hi, I'm Pulse — your live TTC assistant. Ask me about arrivals, delays, or your commute." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);
  // The user's location (shared origin permission with the map). Sent with each
  // request so Pulse can answer "near me" without asking. If the user opens Ask
  // Pulse first, this prompts here; if they used the map first, it resolves silently.
  const locRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => { locRef.current = { lat: p.coords.latitude, lng: p.coords.longitude }; },
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat]);

  // Auto-send a trip query handed off from the Live Map ("?q=...").
  useEffect(() => {
    if (sentInitial.current) return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      sentInitial.current = true;
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Replace the trailing (streaming) assistant message in place.
  const setLastAssistant = (text: string, cards?: ArrivalCard[]) =>
    setChat((c) => {
      const copy = [...c];
      copy[copy.length - 1] = { role: "assistant", text, cards };
      return copy;
    });

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;

    const history: ChatMsg[] = [...chat, { role: "user", text }];
    setChat([...history, { role: "assistant", text: "" }]);
    setInput("");
    setBusy(true);

    let assistantText = "";
    const cards: ArrivalCard[] = [];
    const cardKey = (c: ArrivalCard) => `${c.route}|${c.stop}|${c.routeName}`;

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, location: locRef.current }),
      });
      if (!res.body || (!res.ok && !res.headers.get("content-type")?.includes("application/x-ndjson"))) throw new Error(String(res.status));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let ev: { type: string; text?: string; card?: ArrivalCard; message?: string };
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.type === "text" && ev.text) {
            assistantText += ev.text;
            setLastAssistant(assistantText, cards);
          } else if (ev.type === "card" && ev.card) {
            const key = cardKey(ev.card);
            if (!cards.some((c) => cardKey(c) === key)) cards.push(ev.card); // dedupe
            setLastAssistant(assistantText, cards);
          } else if (ev.type === "error") {
            assistantText = assistantText || ev.message || "Something went wrong. Please try again.";
            setLastAssistant(assistantText, cards);
          }
        }
      }
      if (!assistantText && !cards.length) setLastAssistant("Sorry, I didn't catch that — could you rephrase?", cards);
    } catch {
      setLastAssistant("I couldn't reach the assistant just now. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen pt-[84px] pb-6 px-[clamp(16px,4vw,48px)]">
      <div data-rv className="max-w-[1240px] mx-auto grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5" style={{ height: "calc(100vh - 108px)" }}>

        <div className="hidden lg:flex flex-col gap-3.5 min-h-0 overflow-y-auto">
          <div className="rounded-[18px] overflow-hidden" style={{ background: "#0C0C0C", border: "1px solid rgba(255,255,255,.09)" }}>
            <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              <span className="flex items-center gap-2 text-[13.5px] font-semibold">
                <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#16A34A", boxShadow: "0 0 7px #16A34A", animation: "blink 1.8s ease-in-out infinite" }} />
                Smart arrivals
              </span>
              <span className="font-mono text-[10.5px] text-white/40">live</span>
            </div>
            {board.map((b) => (
              <div key={b.id} className="flex items-center gap-[11px] px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                <span className="inline-flex items-center justify-center min-w-9 h-9 px-[9px] rounded-[9px] font-bold text-[13px]" style={{ color: b.tcol, background: b.color }}>{b.badge}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{b.dest}</div>
                  <div className="text-[11px] text-white/[.42]">{b.sub}</div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: "#4ADE80" }}>
                  <span className="w-[6px] h-[6px] rounded-full" style={{ background: "#4ADE80", boxShadow: "0 0 6px #4ADE80" }} />
                  live
                </span>
              </div>
            ))}
          </div>
          <div className="rounded-[18px] overflow-hidden" style={{ background: "#0C0C0C", border: "1px solid rgba(255,255,255,.09)" }}>
            <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              <span className="text-[13.5px] font-semibold">Service alerts</span>
              <div className="flex items-center gap-3">
                <a href="https://www.ttc.ca/service-alerts" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10.5px] font-mono text-[#A78BFA] hover:text-white transition-colors" title="Official TTC service alerts">
                  ttc.ca <ExternalLink size={10} strokeWidth={2.2} />
                </a>
                <button onClick={refresh} disabled={refreshing} aria-label="Refresh alerts" className="inline-flex items-center gap-1.5 text-[10.5px] font-mono text-white/50 hover:text-white/80 transition-colors disabled:opacity-50">
                  <RefreshCw size={11} strokeWidth={2.2} style={refreshing ? { animation: "spin 1s linear infinite" } : undefined} />
                  {refreshing ? "…" : "refresh"}
                </button>
              </div>
            </div>
            {alerts.length === 0 ? (
              <div className="px-4 py-5 text-[11.5px] text-white/40">No active alerts right now.</div>
            ) : (
              alerts.slice(0, 5).map((a) => (
                <div key={a.id} className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,.05)", borderLeft: `3px solid ${a.color}` }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-semibold">{a.title}</span>
                    <span className="text-[10px] px-[7px] py-0.5 rounded-full text-white" style={{ background: sevBg(a.sev) }}>{sevLabel(a.sev)}</span>
                  </div>
                  <div className="text-[11px] text-white/45 mt-1 leading-[1.4]">{a.desc}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col min-h-0 rounded-[22px] overflow-hidden" style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,.09)" }}>
          <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
            <span className="inline-flex w-10 h-10 rounded-xl items-center justify-center flex-none" style={{ background: "linear-gradient(135deg,#2563EB,#7C3AED)" }}>
              <Sparkles size={19} fill="#fff" stroke="none" />
            </span>
            <div className="flex-1">
              <div className="text-[17px] font-bold tracking-[-.3px]">Ask Pulse</div>
              <div className="flex items-center gap-1.5 text-[12px] text-white/50">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#16A34A", boxShadow: "0 0 7px #16A34A" }} />
                {busy ? "Thinking…" : "Connected to live TTC data"}
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 px-5 py-[18px]">
            {chat.map((m, i) => {
              const streaming = busy && i === chat.length - 1 && m.role === "assistant" && !m.text;
              return (
                <div key={i} className="flex flex-col" style={{ animation: "msgIn .4s ease both", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                  {m.role === "user" ? (
                    <div className="self-end max-w-[78%] px-[17px] py-[13px] text-[14.5px] font-medium leading-[1.45]" style={{ borderRadius: "18px 18px 5px 18px", background: "#fff", color: "#0A0A0A" }}>{m.text}</div>
                  ) : (
                    <div className="self-start max-w-[84%] flex flex-col gap-[11px]">
                      <div className="px-[17px] py-3.5 text-[14.5px] leading-[1.55] text-white/85" style={{ borderRadius: "18px 18px 18px 5px", background: "#141414", border: "1px solid rgba(255,255,255,.08)" }}>
                        {streaming ? (
                          <span className="inline-flex items-center gap-1">
                            {[0, 1, 2].map((d) => (
                              <span key={d} className="w-[6px] h-[6px] rounded-full" style={{ background: "rgba(255,255,255,.5)", animation: `typingDot 1.2s ease-in-out ${d * 0.18}s infinite` }} />
                            ))}
                          </span>
                        ) : (
                          m.text
                        )}
                      </div>
                      {(m.cards ?? (m.card ? [m.card] : [])).map((card, ci) => (
                        <div key={ci} className="rounded-2xl overflow-hidden" style={{ background: "#0C0C0C", border: "1px solid rgba(255,255,255,.1)" }}>
                          <div className="h-1" style={{ background: card.color }} />
                          <div className="px-[18px] py-4">
                            <div className="flex items-center gap-[11px]">
                              <span className="inline-flex items-center justify-center min-w-10 h-10 px-3 rounded-[11px] font-bold text-[14px] text-white" style={{ background: card.color }}>{card.route}</span>
                              <div>
                                <div className="text-[15px] font-semibold">{card.routeName}</div>
                                <div className="text-[12.5px] text-white/50">{card.stop} • {card.direction}</div>
                              </div>
                            </div>
                            <div className="flex items-end gap-[18px] mt-[15px]">
                              <div>
                                <div className="text-[11px] text-white/45">Next</div>
                                <div className="text-[24px] font-bold leading-none mt-[3px]" style={{ color: "#4ADE80" }}>{card.next}</div>
                              </div>
                              <div className="flex-1">
                                <div className="text-[11px] text-white/45">Then</div>
                                <div className="text-[14px] font-semibold mt-[3px]">{card.then}</div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-3.5 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,.07)" }}>
                              <span className="inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: "#4ADE80" }}>
                                <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#4ADE80" }} />
                                {card.status}
                              </span>
                              <span className="font-mono text-[11.5px] text-white/[.42]">updated {card.updated}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* suggested prompts */}
          <div className="flex gap-2 flex-wrap px-[18px] py-3">
            {PROMPTS.map((p) => (
              <button key={p} onClick={() => send(p)} disabled={busy} className="px-[15px] py-[9px] rounded-full text-[13px] font-medium text-white/[.78] transition-all hover:bg-[#1f1f1f] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: "#141414", border: "1px solid rgba(255,255,255,.1)" }}>
                {p}
              </button>
            ))}
          </div>

          {/* input bar */}
          <div className="flex items-center gap-2.5 px-[18px] pt-1 pb-[18px]">
            <div className="flex-1 flex items-center gap-2.5 px-[18px] py-3.5 rounded-2xl" style={{ background: "#101010", border: "1px solid rgba(255,255,255,.12)" }}>
              <ArrowUp size={17} strokeWidth={2} color="rgba(255,255,255,.4)" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
                disabled={busy}
                placeholder="Ask about a route, stop, delay or your commute…"
                className="flex-1 bg-transparent border-none outline-none text-white text-[14.5px] disabled:opacity-60"
              />
            </div>
            <button onClick={() => send(input)} disabled={busy} aria-label="Send" className="w-[50px] h-[50px] rounded-[15px] flex items-center justify-center flex-none text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0" style={{ background: "linear-gradient(135deg,#2563EB,#7C3AED)" }}>
              <Send size={19} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
