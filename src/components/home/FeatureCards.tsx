"use client";

import { useTicker, useDemoChat } from "@/lib/hooks";
import { Bus } from "lucide-react";

export default function FeatureCards() {
  const board = useTicker();
  const boardTop = board.slice(0, 2);
  const demoMsgs = useDemoChat();

  return (
    <section id="features" className="max-w-site mx-auto px-[clamp(20px,5vw,64px)] pt-5 pb-[60px]">
      <div className="flex flex-col gap-[30px]">
        {/* Card 1: Live Map */}
        <div className="sticky top-[90px] h-[560px] rounded-[26px] overflow-hidden" style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,.09)" }}>
          <svg viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
            <defs>
              <path id="cmY" d="M-20 540 C300 520 420 300 720 300 C1020 300 1140 520 1480 520" />
              <path id="cmG" d="M240 820 C300 560 520 480 600 280 C660 130 680 40 700 -20" />
              <path id="cmB" d="M-20 250 C320 280 460 430 820 440 C1120 448 1240 360 1480 360" />
            </defs>
            <g stroke="rgba(255,255,255,.05)" strokeWidth="1">
              <path d="M0 200H1440M0 400H1440M0 600H1440M240 0V800M480 0V800M720 0V800M960 0V800M1200 0V800" fill="none" />
            </g>
            <use href="#cmY" fill="none" stroke="#F7C400" strokeWidth="3" strokeLinecap="round" opacity=".8" />
            <use href="#cmG" fill="none" stroke="#00923F" strokeWidth="3" strokeLinecap="round" opacity=".7" />
            <use href="#cmB" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" opacity=".55" />
            <use href="#cmY" fill="none" stroke="#fff" strokeWidth="1.2" opacity=".4" strokeDasharray="2 16">
              <animate attributeName="stroke-dashoffset" from="0" to="-200" dur="3.6s" repeatCount="indefinite" />
            </use>
            <use href="#cmB" fill="none" stroke="#fff" strokeWidth="1.2" opacity=".35" strokeDasharray="2 16">
              <animate attributeName="stroke-dashoffset" from="0" to="-200" dur="4.4s" repeatCount="indefinite" />
            </use>
            <rect x="-9" y="-5" width="18" height="10" rx="4" fill="#F7C400">
              <animateMotion dur="14s" repeatCount="indefinite" rotate="auto"><mpath href="#cmY" /></animateMotion>
            </rect>
            <rect x="-8" y="-5" width="16" height="10" rx="3" fill="#00923F">
              <animateMotion dur="16s" begin="-5s" repeatCount="indefinite" rotate="auto"><mpath href="#cmG" /></animateMotion>
            </rect>
            <rect x="-8" y="-5" width="16" height="10" rx="5" fill="#2563EB">
              <animateMotion dur="15s" begin="-7s" repeatCount="indefinite" rotate="auto"><mpath href="#cmB" /></animateMotion>
            </rect>
          </svg>

          <div className="absolute flex w-10 h-10 rounded-full items-center justify-center font-bold text-[15px]" style={{ left: "46%", top: "36%", background: "#F7C400", color: "#1F2937", border: "3px solid #0A0A0A" }}>1</div>
          <div className="absolute flex items-center gap-1.5 px-[10px] py-[7px] rounded-[9px] text-white font-bold text-[13px]" style={{ left: "30%", top: "58%", background: "#D71920", border: "2.5px solid #0A0A0A" }}>
            <Bus size={13} strokeWidth={2.4} />939
          </div>
          <div className="absolute flex items-center gap-1.5 px-3 py-[7px] rounded-full text-white font-bold text-[13px]" style={{ left: "62%", top: "50%", background: "#2563EB", border: "2.5px solid #0A0A0A" }}>504</div>

          <div className="absolute top-[30px] left-[30px] flex gap-2">
            <span className="px-3 py-1.5 rounded-full font-mono text-[11px] text-white/75" style={{ border: "1px solid rgba(255,255,255,.18)" }}>GTFS-RT</span>
            <span className="px-3 py-1.5 rounded-full font-mono text-[11px] text-white/75" style={{ border: "1px solid rgba(255,255,255,.18)" }}>Vehicles</span>
          </div>
          <h3 className="absolute top-[84px] left-[30px] text-[60px] font-bold tracking-[-2px] m-0">Live Map</h3>

          <div className="absolute top-[198px] left-[30px] rounded-[18px] overflow-hidden" style={{ width: "min(330px,42%)", background: "rgba(14,14,14,.72)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 24px 60px rgba(0,0,0,.45)" }}>
            <div className="flex items-center justify-between px-4 py-[14px]" style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              <span className="flex items-center gap-2 text-[12.5px] font-semibold">
                <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#16A34A", boxShadow: "0 0 7px #16A34A", animation: "blink 1.8s ease-in-out infinite" }} />
                Live network
              </span>
              <span className="font-mono text-[10.5px] text-white/40">GTFS-RT</span>
            </div>
            <div className="flex gap-3 px-4 py-[14px]" style={{ borderBottom: "1px solid rgba(255,255,255,.06)" }}>
              <div className="flex-1">
                <div className="font-mono text-[24px] font-semibold" style={{ animation: "tickPulse 2s ease-in-out infinite" }}>247</div>
                <div className="text-[11px] text-white/45">vehicles live</div>
              </div>
              <div className="flex-1">
                <div className="font-mono text-[24px] font-semibold" style={{ color: "#4ADE80" }}>98%</div>
                <div className="text-[11px] text-white/45">on time</div>
              </div>
            </div>
            {boardTop.map((b) => (
              <div key={b.id} className="flex items-center gap-2.5 px-4 py-[11px]" style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                <span className="inline-flex items-center justify-center min-w-[34px] h-[34px] px-[9px] rounded-[9px] font-bold text-[12px]" style={{ color: b.tcol, background: b.color }}>{b.badge}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{b.dest}</div>
                  <div className="text-[10.5px] text-white/40">{b.dir}</div>
                </div>
                <span className="font-mono text-[14px] font-semibold" style={{ color: "#4ADE80" }}>{b.mins}</span>
              </div>
            ))}
          </div>

          <div className="absolute bottom-[30px] left-[30px] max-w-[380px] px-5 py-4 rounded-2xl text-[15px] leading-[1.5] text-white/[.78]" style={{ background: "rgba(20,20,20,.85)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.08)" }}>
            See buses, streetcars, and trains where available in real time.
          </div>
        </div>

        {/* Card 2: Smart Arrivals */}
        <div className="sticky top-[104px] h-[560px] rounded-[26px] overflow-hidden" style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,.09)" }}>
          <div className="absolute inset-0" style={{ background: "radial-gradient(80% 80% at 82% 35%, rgba(37,99,235,.12), transparent 60%)" }} />
          <div className="relative h-full flex flex-col md:flex-row items-center gap-11 px-[clamp(28px,4vw,56px)]">
            <div className="flex-1 md:max-w-[44%] min-w-0">
              <div className="flex gap-2">
                <span className="px-3 py-1.5 rounded-full font-mono text-[11px] text-white/75" style={{ border: "1px solid rgba(255,255,255,.18)" }}>Trip Updates</span>
                <span className="px-3 py-1.5 rounded-full font-mono text-[11px] text-white/75" style={{ border: "1px solid rgba(255,255,255,.18)" }}>ETAs</span>
              </div>
              <h3 className="text-[clamp(34px,4vw,50px)] font-bold tracking-[-1.5px] my-[18px] leading-[1.02]">Smart Arrivals</h3>
              <p className="text-[16px] leading-[1.55] text-white/60 m-0 max-w-[340px]">Know when your ride is coming before you leave — by route, stop or station.</p>
            </div>
            <div className="flex-1 min-w-0 w-full rounded-[18px] overflow-hidden" style={{ background: "#0E0E0E", border: "1px solid rgba(255,255,255,.08)", boxShadow: "0 24px 60px rgba(0,0,0,.4)" }}>
              <div className="flex items-center justify-between px-[18px] py-[15px]" style={{ borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                <span className="flex items-center gap-2 text-[13px] font-semibold text-white/85">
                  <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#16A34A", boxShadow: "0 0 7px #16A34A", animation: "blink 1.8s ease-in-out infinite" }} />
                  Finch West Station
                </span>
                <span className="font-mono text-[11px] text-white/40">live</span>
              </div>
              {board.map((b) => (
                <div key={b.id} className="flex items-center gap-3 px-[18px] py-[13px]" style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                  <span className="inline-flex items-center justify-center min-w-10 h-10 px-[11px] rounded-[10px] font-bold text-[13px]" style={{ color: b.tcol, background: b.color }}>{b.badge}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold">{b.dest}</div>
                    <div className="text-[11.5px] text-white/[.42]">{b.dir}</div>
                    <div className="h-[3px] rounded-sm mt-[7px] overflow-hidden" style={{ background: "rgba(255,255,255,.08)" }}>
                      <div className="h-full rounded-sm" style={{ width: b.prog, background: b.color, transition: "width 1s linear" }} />
                    </div>
                  </div>
                  <div className="text-right min-w-[42px]">
                    <div className="font-mono text-[18px] font-semibold leading-none" style={{ color: "#4ADE80" }}>{b.mins}</div>
                    <div className="text-[10px] text-white/[.42]">{b.unit}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Service Alerts */}
        <div className="sticky top-[118px] h-[560px] rounded-[26px] overflow-hidden" style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,.09)" }}>
          <div className="absolute inset-0" style={{ background: "radial-gradient(80% 80% at 82% 35%, rgba(245,158,11,.1), transparent 60%)" }} />
          <div className="relative h-full flex flex-col md:flex-row items-center gap-11 px-[clamp(28px,4vw,56px)]">
            <div className="flex-1 md:max-w-[44%] min-w-0">
              <div className="flex gap-2">
                <span className="px-3 py-1.5 rounded-full font-mono text-[11px] text-white/75" style={{ border: "1px solid rgba(255,255,255,.18)" }}>Alerts</span>
                <span className="px-3 py-1.5 rounded-full font-mono text-[11px] text-white/75" style={{ border: "1px solid rgba(255,255,255,.18)" }}>Disruptions</span>
              </div>
              <h3 className="text-[clamp(34px,4vw,50px)] font-bold tracking-[-1.5px] my-[18px] leading-[1.02]">Service Alerts</h3>
              <p className="text-[16px] leading-[1.55] text-white/60 m-0 max-w-[340px]">Understand delays and service changes without digging through official notices.</p>
            </div>
            <div className="flex-1 min-w-0 w-full flex flex-col gap-[11px]">
              <div className="flex items-center justify-between px-0.5">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-white/85">
                  <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#DC2626", boxShadow: "0 0 7px #DC2626", animation: "blink 1.6s ease-in-out infinite" }} />
                  3 active alerts
                </span>
                <span className="font-mono text-[11px] text-white/40">live</span>
              </div>
              {[
                { bar: "#DC2626", title: "Line 2 — Minor delays", chip: "Major", chipBg: "rgba(220,38,38,.18)", chipFg: "#F87171", desc: "Signal work between Broadview and Castle Frank.", upd: "updated 4 min ago" },
                { bar: "#F59E0B", title: "504 King — Short turning", chip: "Minor", chipBg: "rgba(245,158,11,.18)", chipFg: "#FBBF24", desc: "Some cars short-turning at Church near Spadina.", upd: "updated 12 min ago" },
                { bar: "#2563EB", title: "36 Finch West — Detour", chip: "Info", chipBg: "rgba(37,99,235,.18)", chipFg: "#60A5FA", desc: "Via Sentinel Rd around watermain repair.", upd: "updated 31 min ago" },
              ].map((a, i) => (
                <div key={i} className="rounded-md px-[18px] py-[14px]" style={{ borderLeft: `3px solid ${a.bar}`, background: "#111" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold">{a.title}</span>
                    <span className="text-[11px] px-2 py-[3px] rounded-full font-semibold" style={{ background: a.chipBg, color: a.chipFg }}>{a.chip}</span>
                  </div>
                  <div className="text-[12.5px] text-white/50 mt-1.5 leading-[1.45]">{a.desc}</div>
                  <div className="font-mono text-[10.5px] text-white/[.35] mt-2">{a.upd}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 4: Ask Pulse */}
        <div className="sticky top-[132px] h-[560px] rounded-[26px] overflow-hidden" style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,.09)" }}>
          <div className="absolute inset-0" style={{ background: "radial-gradient(80% 80% at 80% 35%, rgba(124,58,237,.14), transparent 60%)" }} />
          <div className="relative h-full flex flex-col md:flex-row items-center gap-11 px-[clamp(28px,4vw,56px)]">
            <div className="flex-1 md:max-w-[44%] min-w-0">
              <div className="flex gap-2">
                <span className="px-3 py-1.5 rounded-full font-mono text-[11px] text-white/75" style={{ border: "1px solid rgba(255,255,255,.18)" }}>AI Assistant</span>
                <span className="px-3 py-1.5 rounded-full font-mono text-[11px] text-white/75" style={{ border: "1px solid rgba(255,255,255,.18)" }}>Commute</span>
              </div>
              <h3 className="text-[clamp(34px,4vw,50px)] font-bold tracking-[-1.5px] my-[18px] leading-[1.02]">Ask Pulse</h3>
              <p className="text-[16px] leading-[1.55] text-white/60 m-0 max-w-[340px]">Ask natural questions about routes, stops, delays and arrivals — and get a clear answer.</p>
            </div>
            <div className="flex-1 min-w-0 w-full flex flex-col justify-end h-[420px] overflow-hidden gap-[9px]">
              {demoMsgs.map((m, i) => (
                <div key={i} className="flex flex-col" style={{ animation: "msgIn .45s ease both", alignItems: m.isUser ? "flex-end" : "flex-start" }}>
                  {m.isUser ? (
                    <div className="self-end max-w-[80%] px-4 py-3 text-[14px] font-medium leading-[1.4]" style={{ borderRadius: "16px 16px 4px 16px", background: "#fff", color: "#0A0A0A" }}>{m.text}</div>
                  ) : (
                    <div className="self-start max-w-[88%] px-4 py-[13px] text-[14px] leading-[1.5] text-white/85" style={{ borderRadius: "16px 16px 16px 4px", background: "#161616", border: "1px solid rgba(255,255,255,.08)" }}>{m.text}</div>
                  )}
                </div>
              ))}
              <div className="self-start flex items-center gap-[5px] px-[15px] py-[11px] rounded-[14px]" style={{ background: "#161616", border: "1px solid rgba(255,255,255,.08)" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#A78BFA", animation: "typingDot 1.2s ease-in-out infinite" }} />
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#A78BFA", animation: "typingDot 1.2s ease-in-out infinite .15s" }} />
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#A78BFA", animation: "typingDot 1.2s ease-in-out infinite .3s" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
