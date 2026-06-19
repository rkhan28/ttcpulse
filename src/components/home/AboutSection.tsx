"use client";

import { useTicker } from "@/lib/hooks";
import { Zap, TramFront, Clock, Bell, Sparkles, ArrowUpRight } from "lucide-react";

export default function AboutSection() {
  const board = useTicker();
  const nextMin = board[0].mins;

  return (
    <section id="about" data-rv className="max-w-site mx-auto px-[clamp(20px,5vw,64px)] pt-[100px] pb-[70px]">
      <span className="inline-flex items-center gap-2 px-[13px] py-1.5 rounded-full text-[12px] font-medium text-white/70" style={{ border: "1px solid rgba(255,255,255,.16)" }}>
        <Zap size={14} strokeWidth={2} color="#D71920" />
        About Pulse
      </span>
      <h2 className="text-[46px] leading-[1.06] tracking-[-1.5px] font-bold mt-5 mb-10">What TTC Pulse does</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* animated phone mockup */}
        <div className="flex justify-center items-center py-2.5">
          <div
            className="relative w-[278px] h-[560px] overflow-hidden"
            style={{ borderRadius: "44px", background: "#0A0A0A", border: "9px solid #161616", boxShadow: "0 40px 80px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.05)", animation: "softFloat 6s ease-in-out infinite" }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[118px] h-6 z-[5]" style={{ background: "#161616", borderRadius: "0 0 16px 16px" }} />
            <div className="absolute inset-0 flex flex-col" style={{ background: "linear-gradient(180deg,#0b1020,#08080c)" }}>
              <div className="flex items-center justify-between px-[22px] pt-[14px] pb-1.5 text-[12px] font-semibold text-white/70">
                <span className="font-mono">9:41</span>
                <span className="flex items-center gap-[5px]">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#16A34A", boxShadow: "0 0 6px #16A34A" }} />
                  Live
                </span>
              </div>
              <div className="relative flex-1 mt-1.5 mx-3 rounded-[18px] overflow-hidden" style={{ background: "#0E1422" }}>
                <svg viewBox="0 0 240 360" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
                  <defs>
                    <path id="phR" d="M20 340 C40 240 60 220 120 180 C180 140 190 90 210 20" />
                  </defs>
                  <g stroke="rgba(255,255,255,.05)" strokeWidth="1">
                    <path d="M0 90H240M0 180H240M0 270H240M80 0V360M160 0V360" fill="none" />
                  </g>
                  <path d="M-10 130 H250" stroke="#00923F" strokeWidth="4" opacity=".7" />
                  <use href="#phR" fill="none" stroke="#F7C400" strokeWidth="4" strokeLinecap="round" />
                  <use href="#phR" fill="none" stroke="#fff" strokeWidth="1.2" opacity=".5" strokeDasharray="2 12">
                    <animate attributeName="stroke-dashoffset" from="0" to="-120" dur="3s" repeatCount="indefinite" />
                  </use>
                  <rect x="-7" y="-4" width="14" height="8" rx="3" fill="#F7C400">
                    <animateMotion dur="9s" repeatCount="indefinite" rotate="auto"><mpath href="#phR" /></animateMotion>
                  </rect>
                  <circle cx="120" cy="180" r="7" fill="none" stroke="#ff5470" strokeWidth="1.5">
                    <animate attributeName="r" values="7;22" dur="2.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values=".9;0" dur="2.2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="120" cy="180" r="5" fill="#ff5470" />
                </svg>
                <div className="absolute left-2.5 right-2.5 bottom-2.5 px-[13px] py-[11px] rounded-[14px] flex items-center gap-2.5" style={{ background: "rgba(10,10,14,.8)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,.12)" }}>
                  <span className="inline-flex items-center justify-center min-w-[34px] h-[34px] px-2 rounded-[9px] font-bold text-[12px] text-white" style={{ background: "#D71920" }}>939</span>
                  <div className="flex-1">
                    <div className="text-[12px] font-semibold">Finch West</div>
                    <div className="text-[10px] text-white/45">Eastbound</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[16px] font-semibold leading-none" style={{ color: "#4ADE80" }}>{nextMin}</div>
                    <div className="text-[9px] text-white/45">min</div>
                  </div>
                </div>
              </div>
              <div className="flex justify-around items-center pt-[14px] pb-[18px]">
                <TramFront size={22} strokeWidth={2} color="#D71920" />
                <Clock size={22} strokeWidth={2} color="rgba(255,255,255,.35)" />
                <Bell size={22} strokeWidth={2} color="rgba(255,255,255,.35)" />
                <Sparkles size={22} fill="rgba(255,255,255,.35)" stroke="none" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[17px] leading-[1.65] text-white/[.62] m-0">
            TTC Pulse turns live transit data into a clear, usable commute experience. It brings together vehicle positions, arrival predictions, service alerts, saved routes, and an AI assistant so riders can understand what is happening before they start moving.
          </p>
          <div className="flex flex-wrap gap-2.5 mt-[26px]">
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13.5px] font-medium" style={{ border: "1px solid rgba(255,255,255,.16)" }}>
              <TramFront size={15} strokeWidth={2} color="#D71920" />Live Map
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13.5px] font-medium" style={{ border: "1px solid rgba(255,255,255,.16)" }}>
              <Clock size={15} strokeWidth={2} color="#2563EB" />Arrivals
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13.5px] font-medium" style={{ border: "1px solid rgba(255,255,255,.16)" }}>
              <Bell size={15} strokeWidth={2} color="#F59E0B" />Alerts
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13.5px] font-medium" style={{ border: "1px solid rgba(255,255,255,.16)" }}>
              <Sparkles size={15} fill="#fff" stroke="none" />Ask Pulse
            </span>
          </div>
          <a href="#features" className="inline-flex items-center gap-[9px] mt-7 px-[22px] py-[13px] rounded-xl text-[14.5px] font-semibold text-white transition-colors hover:bg-[#242424]" style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,.1)" }}>
            Explore features
            <ArrowUpRight size={15} strokeWidth={2} />
          </a>
        </div>
      </div>
    </section>
  );
}
