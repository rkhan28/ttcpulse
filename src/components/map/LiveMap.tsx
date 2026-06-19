"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Crosshair, Layers, Plus, Minus, X, Sparkles} from "lucide-react";
import { VEHICLES, Mode } from "@/lib/data";

const modeLabel = (t: Mode) => (t === "subway" ? "Subway" : t === "streetcar" ? "Streetcar" : "Bus");

function chipStyle(t: Mode, color: string, tc: string): React.CSSProperties {
  const base: React.CSSProperties = { background: color, color: tc };
  if (t === "subway") return { ...base, width: 40, height: 40, justifyContent: "center", borderRadius: "50%" };
  if (t === "streetcar") return { ...base, height: 32, padding: "0 13px", borderRadius: 999 };
  return { ...base, height: 32, padding: "0 11px", borderRadius: 10 };
}

export default function LiveMap() {
  const [selected, setSelected] = useState<string | null>("t504");
  const [filters, setFilters] = useState({ subway: true, bus: true, streetcar: true });

  const sel = VEHICLES.find((v) => v.id === selected) || null;
  const toggle = (k: keyof typeof filters) => setFilters((f) => ({ ...f, [k]: !f[k] }));

  const activeChip = "background:#fff;color:#0A0A0A;border:1px solid #fff;";
  const idleChip = "background:rgba(12,12,12,.82);color:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.14);";
  const cssToObj = (s: string): React.CSSProperties =>
    Object.fromEntries(
      s.split(";").filter(Boolean).map((d) => {
        const [k, v] = d.split(":");
        return [k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v.trim()];
      })
    ) as React.CSSProperties;

  return (
    <div className="min-h-screen pt-[94px] pb-14 px-[clamp(16px,4vw,48px)]">
      <div data-rv className="max-w-site mx-auto flex items-end justify-between gap-5 flex-wrap mb-[22px]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-[5px] rounded-full text-[12px] text-white/70" style={{ border: "1px solid rgba(255,255,255,.14)" }}>
            <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#16A34A", boxShadow: "0 0 8px #16A34A" }} />
            Live feed • Toronto
          </div>
          <h1 className="text-[34px] font-bold tracking-[-1px] mt-3.5 mb-0">Live Map</h1>
        </div>
        <Link href="/ask" className="inline-flex items-center gap-2 px-[18px] py-[11px] rounded-xl text-[13.5px] font-semibold text-white transition-colors hover:bg-[#242424]" style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,.1)" }}>
          <Sparkles size={15} fill="#fff" stroke="none" />Ask Pulse
        </Link>
      </div>

      <div data-rv className="max-w-site mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-[18px]">
        {/* MAP PANEL */}
        <div className="relative min-h-[600px] rounded-3xl overflow-hidden order-2 lg:order-1" style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,.1)" }}>
          <svg viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
            <defs>
              <path id="ml1" d="M120 720 C150 470 150 320 360 300 C560 280 640 200 760 60" />
              <path id="ml2" d="M-20 360 C220 360 320 420 520 430 C720 440 860 380 1020 410" />
            </defs>
            <g stroke="rgba(255,255,255,.045)" strokeWidth="1">
              <path d="M0 140H1000M0 280H1000M0 420H1000M0 560H1000M167 0V700M334 0V700M500 0V700M667 0V700M834 0V700" fill="none" />
            </g>
            <path d="M-20 560 C260 545 460 600 680 588 C860 578 940 600 1020 592 L1020 720 L-20 720 Z" fill="rgba(37,99,235,.06)" />
            <rect x="120" y="150" width="180" height="120" rx="10" fill="rgba(255,255,255,.02)" />
            <rect x="640" y="430" width="200" height="120" rx="10" fill="rgba(255,255,255,.02)" />
            <g fill="none" strokeLinecap="round">
              <use href="#ml1" stroke="#F7C400" strokeWidth="6" opacity=".75" />
              <path d="M40 470 C260 450 420 250 760 250 C900 250 980 300 1020 300" stroke="#00923F" strokeWidth="6" opacity=".7" />
              <path d="M80 700 C160 520 320 460 520 430 C760 395 900 470 1020 470" stroke="#2563EB" strokeWidth="5" opacity=".6" />
              <use href="#ml2" stroke="#D71920" strokeWidth="4" opacity=".5" strokeDasharray="2 12">
                <animate attributeName="stroke-dashoffset" from="0" to="-140" dur="3s" repeatCount="indefinite" />
              </use>
            </g>
            <g>
              <rect x="-8" y="-5" width="16" height="10" rx="4" fill="#F7C400">
                <animateMotion dur="14s" repeatCount="indefinite" rotate="auto"><mpath href="#ml1" /></animateMotion>
              </rect>
              <rect x="-8" y="-5" width="16" height="10" rx="3" fill="#D71920">
                <animateMotion dur="12s" begin="-4s" repeatCount="indefinite" rotate="auto"><mpath href="#ml2" /></animateMotion>
              </rect>
            </g>
          </svg>

          {/* vehicle markers */}
          {VEHICLES.map((v) => {
            const dim = !filters[v.type];
            const isSel = selected === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setSelected(v.id)}
                aria-label={`${v.label} ${v.line}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-[4]"
                style={{ left: `${v.x}%`, top: `${v.y}%`, opacity: dim ? 0.16 : 1, transition: "opacity .3s ease" }}
              >
                <span className="absolute left-1/2 top-1/2 w-[42px] h-[42px] rounded-full -translate-x-1/2 -translate-y-1/2" style={{ background: "rgba(255,255,255,.18)", animation: "pulseRing 2.6s ease-out infinite" }} />
                <span
                  className="relative inline-flex items-center gap-[5px] font-bold text-[13px] transition-transform hover:scale-110"
                  style={{ ...chipStyle(v.type, v.color, v.tc), border: "2.5px solid #0A0A0A", boxShadow: "0 5px 14px rgba(0,0,0,.5)", ...(isSel ? { outline: "2.5px solid #fff", outlineOffset: 3 } : {}) }}
                >
                  {v.label}
                </span>
              </button>
            );
          })}

          {/* search + filters (top-left) */}
          <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3 flex-wrap z-[6]">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5 w-[280px] max-w-[60vw] px-3.5 py-[11px] rounded-[13px]" style={{ background: "rgba(12,12,12,.82)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,.12)" }}>
                <Search size={16} strokeWidth={2} color="rgba(255,255,255,.55)" />
                <span className="text-[13.5px] text-white/50">Search route, stop or station</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {([
                  { k: "subway", label: "Subway", dot: "#F7C400" },
                  { k: "bus", label: "Bus", dot: "#D71920" },
                  { k: "streetcar", label: "Streetcar", dot: "#2563EB" },
                ] as const).map((c) => (
                  <button
                    key={c.k}
                    onClick={() => toggle(c.k)}
                    className="inline-flex items-center gap-[7px] px-[13px] py-2 rounded-full text-[12.5px] font-semibold transition-all"
                    style={cssToObj(filters[c.k] ? activeChip : idleChip)}
                  >
                    <span className="w-[9px] h-[9px] rounded-full" style={{ background: c.dot }} />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-[7px] px-3 py-2 rounded-full text-[12px] text-white/70" style={{ background: "rgba(12,12,12,.82)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,.12)" }}>
                <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#16A34A", boxShadow: "0 0 7px #16A34A", animation: "blink 2s ease-in-out infinite" }} />
                Feed live
              </span>
              <span className="px-3 py-2 rounded-full font-mono text-[11.5px] text-white/55" style={{ background: "rgba(12,12,12,.82)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,.12)" }}>updated 8s</span>
            </div>
          </div>

          {/* controls (bottom-right) */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-[6]">
            <button onClick={() => setSelected(null)} aria-label="Recenter" className="w-[42px] h-[42px] rounded-xl flex items-center justify-center text-white transition-colors hover:bg-[rgba(30,30,30,.9)]" style={{ background: "rgba(12,12,12,.85)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,.12)" }}>
              <Crosshair size={18} strokeWidth={2} />
            </button>
            <button aria-label="Layers" className="w-[42px] h-[42px] rounded-xl flex items-center justify-center text-white transition-colors hover:bg-[rgba(30,30,30,.9)]" style={{ background: "rgba(12,12,12,.85)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,.12)" }}>
              <Layers size={18} strokeWidth={2} />
            </button>
            <div className="flex flex-col rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,.12)", background: "rgba(12,12,12,.85)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
              <button aria-label="Zoom in" className="w-[42px] h-[38px] flex items-center justify-center text-white transition-colors hover:bg-white/[.07]" style={{ borderBottom: "1px solid rgba(255,255,255,.1)" }}>
                <Plus size={17} strokeWidth={2} />
              </button>
              <button aria-label="Zoom out" className="w-[42px] h-[38px] flex items-center justify-center text-white transition-colors hover:bg-white/[.07]">
                <Minus size={17} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* selected vehicle card (bottom-left) */}
          {sel && (
            <div className="absolute bottom-4 left-4 w-[300px] max-w-[72vw] px-[18px] py-4 rounded-[18px] z-[6]" style={{ background: "rgba(12,12,12,.9)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 16px 40px rgba(0,0,0,.55)" }}>
              <div className="flex items-center gap-[11px]">
                <span className="inline-flex items-center justify-center min-w-[38px] h-[38px] px-[11px] rounded-[11px] font-bold text-[14px] text-white" style={{ background: sel.color }}>{sel.label}</span>
                <div className="flex-1">
                  <div className="text-[11px] font-mono tracking-[.6px] text-white/50">{modeLabel(sel.type)}</div>
                  <div className="text-[14.5px] font-semibold">{sel.line}</div>
                </div>
                <button onClick={() => setSelected(null)} aria-label="Close" className="w-[26px] h-[26px] rounded-lg flex items-center justify-center text-white/55 hover:bg-white/[.08] hover:text-white">
                  <X size={15} strokeWidth={2} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5 mt-3.5">
                <div className="px-3 py-2.5 rounded-[11px]" style={{ background: "rgba(255,255,255,.04)" }}>
                  <div className="text-[11px] text-white/45">Heading to</div>
                  <div className="text-[13.5px] font-semibold mt-0.5">{sel.dest}</div>
                </div>
                <div className="px-3 py-2.5 rounded-[11px]" style={{ background: "rgba(255,255,255,.04)" }}>
                  <div className="text-[11px] text-white/45">Next stop</div>
                  <div className="text-[13.5px] font-semibold mt-0.5">{sel.next}</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: "#4ADE80" }}>
                  <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#4ADE80" }} />
                  {sel.status}
                </span>
                <span className="font-mono text-[11.5px] text-white/45">updated {sel.upd}</span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="flex flex-col gap-4 order-1 lg:order-2">
          <div className="rounded-[20px] overflow-hidden" style={{ background: "#0C0C0C", border: "1px solid rgba(255,255,255,.09)" }}>
            <div className="flex items-center justify-between px-[18px] py-4" style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              <span className="text-[14px] font-semibold">Nearby arrivals</span>
              <span className="font-mono text-[11px] text-white/40">Central Stn</span>
            </div>
            {VEHICLES.map((v) => {
              const dim = !filters[v.type];
              const isSel = selected === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setSelected(v.id)}
                  className="w-full flex items-center gap-3 px-[18px] py-[13px] text-left transition-[background,opacity] hover:bg-white/[.04]"
                  style={{ borderBottom: "1px solid rgba(255,255,255,.05)", opacity: dim ? 0.16 : 1, ...(isSel ? { outline: "2.5px solid #fff", outlineOffset: 3 } : {}) }}
                >
                  <span className="inline-flex items-center justify-center min-w-[38px] h-[38px] px-2.5 rounded-[10px] font-bold text-[13px] text-white" style={{ background: v.color }}>{v.label}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{v.dest}</div>
                    <div className="text-[11.5px] text-white/[.42]">{modeLabel(v.type)} • {v.next}</div>
                  </div>
                  <span className="text-[14px] font-bold" style={{ color: "#4ADE80" }}>{v.eta}</span>
                </button>
              );
            })}
          </div>
          <Link href="/ask" className="text-left rounded-[20px] p-[18px] flex items-center gap-[13px] transition-transform hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg, rgba(37,99,235,.16), rgba(124,58,237,.16))", border: "1px solid rgba(124,58,237,.3)" }}>
            <span className="inline-flex w-10 h-10 rounded-xl items-center justify-center flex-none" style={{ background: "linear-gradient(135deg,#2563EB,#7C3AED)" }}>
              <Sparkles size={19} fill="#fff" stroke="none" />
            </span>
            <div>
              <div className="text-[14.5px] font-semibold">Ask Pulse about this stop</div>
              <div className="text-[12.5px] text-white/55 mt-0.5">&ldquo;When&rsquo;s my next ride home?&rdquo;</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
