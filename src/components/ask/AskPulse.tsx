"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, ArrowUp, Send } from "lucide-react";
import { ALERTS, PROMPTS, ChatMsg, respond } from "@/lib/data";
import { useTicker } from "@/lib/hooks";

const sevLabel = (s: string) => (s === "major" ? "Major" : s === "minor" ? "Minor" : "Info");
const sevBg = (s: string) => `rgba(${s === "major" ? "220,38,38" : s === "minor" ? "245,158,11" : "37,99,235"},.14)`;

export default function AskPulse() {
  const board = useTicker();
  const [chat, setChat] = useState<ChatMsg[]>([
    { role: "assistant", text: "Hi, I'm Pulse — your live TTC assistant. Ask me about arrivals, delays, or your commute." },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setChat((c) => [...c, { role: "user", text: t }, respond(t)]);
    setInput("");
  };

  return (
    <div className="min-h-screen pt-[84px] pb-6 px-[clamp(16px,4vw,48px)]">
      <div data-rv className="max-w-[1240px] mx-auto grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5" style={{ height: "calc(100vh - 108px)" }}>
        {/* LEFT: live context */}
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
                  <div className="text-[11px] text-white/[.42]">{b.dir}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[16px] font-semibold leading-none" style={{ color: "#4ADE80" }}>{b.mins}</div>
                  <div className="text-[10px] text-white/40">{b.unit}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-[18px] overflow-hidden" style={{ background: "#0C0C0C", border: "1px solid rgba(255,255,255,.09)" }}>
            <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              <span className="text-[13.5px] font-semibold">Service alerts</span>
              <span className="font-mono text-[10.5px] text-white/40">live</span>
            </div>
            {ALERTS.map((a) => (
              <div key={a.id} className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,.05)", borderLeft: `3px solid ${a.color}` }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold">{a.title}</span>
                  <span className="text-[10px] px-[7px] py-0.5 rounded-full text-white" style={{ background: sevBg(a.sev) }}>{sevLabel(a.sev)}</span>
                </div>
                <div className="text-[11px] text-white/45 mt-1 leading-[1.4]">{a.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: chat */}
        <div className="flex flex-col min-h-0 rounded-[22px] overflow-hidden" style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,.09)" }}>
          <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
            <span className="inline-flex w-10 h-10 rounded-xl items-center justify-center flex-none" style={{ background: "linear-gradient(135deg,#2563EB,#7C3AED)" }}>
              <Sparkles size={19} fill="#fff" stroke="none" />
            </span>
            <div className="flex-1">
              <div className="text-[17px] font-bold tracking-[-.3px]">Ask Pulse</div>
              <div className="flex items-center gap-1.5 text-[12px] text-white/50">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#16A34A", boxShadow: "0 0 7px #16A34A" }} />
                Connected to live TTC data
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 px-5 py-[18px]">
            {chat.map((m, i) => (
              <div key={i} className="flex flex-col" style={{ animation: "msgIn .4s ease both", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                {m.role === "user" ? (
                  <div className="self-end max-w-[78%] px-[17px] py-[13px] text-[14.5px] font-medium leading-[1.45]" style={{ borderRadius: "18px 18px 5px 18px", background: "#fff", color: "#0A0A0A" }}>{m.text}</div>
                ) : (
                  <div className="self-start max-w-[84%] flex flex-col gap-[11px]">
                    <div className="px-[17px] py-3.5 text-[14.5px] leading-[1.55] text-white/85" style={{ borderRadius: "18px 18px 18px 5px", background: "#141414", border: "1px solid rgba(255,255,255,.08)" }}>{m.text}</div>
                    {m.card && (
                      <div className="rounded-2xl overflow-hidden" style={{ background: "#0C0C0C", border: "1px solid rgba(255,255,255,.1)" }}>
                        <div className="h-1" style={{ background: m.card.color }} />
                        <div className="px-[18px] py-4">
                          <div className="flex items-center gap-[11px]">
                            <span className="inline-flex items-center justify-center min-w-10 h-10 px-3 rounded-[11px] font-bold text-[14px] text-white" style={{ background: m.card.color }}>{m.card.route}</span>
                            <div>
                              <div className="text-[15px] font-semibold">{m.card.routeName}</div>
                              <div className="text-[12.5px] text-white/50">{m.card.stop} • {m.card.direction}</div>
                            </div>
                          </div>
                          <div className="flex items-end gap-[18px] mt-[15px]">
                            <div>
                              <div className="text-[11px] text-white/45">Next</div>
                              <div className="text-[24px] font-bold leading-none mt-[3px]" style={{ color: "#4ADE80" }}>{m.card.next}</div>
                            </div>
                            <div className="flex-1">
                              <div className="text-[11px] text-white/45">Then</div>
                              <div className="text-[14px] font-semibold mt-[3px]">{m.card.then}</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3.5 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,.07)" }}>
                            <span className="inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: "#4ADE80" }}>
                              <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#4ADE80" }} />
                              {m.card.status}
                            </span>
                            <span className="font-mono text-[11.5px] text-white/[.42]">updated {m.card.updated}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* suggested prompts */}
          <div className="flex gap-2 flex-wrap px-[18px] py-3">
            {PROMPTS.map((p) => (
              <button key={p} onClick={() => send(p)} className="px-[15px] py-[9px] rounded-full text-[13px] font-medium text-white/[.78] transition-all hover:bg-[#1f1f1f] hover:text-white" style={{ background: "#141414", border: "1px solid rgba(255,255,255,.1)" }}>
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
                placeholder="Ask about a route, stop, delay or your commute…"
                className="flex-1 bg-transparent border-none outline-none text-white text-[14.5px]"
              />
            </div>
            <button onClick={() => send(input)} aria-label="Send" className="w-[50px] h-[50px] rounded-[15px] flex items-center justify-center flex-none text-white transition-transform hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg,#2563EB,#7C3AED)" }}>
              <Send size={19} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
