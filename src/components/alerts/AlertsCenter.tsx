"use client";

import { useState } from "react";
import { Bell, Sparkles, Share2, Check, Loader2, WifiOff, RefreshCw, ExternalLink } from "lucide-react";
import { Mode } from "@/lib/data";
import { useAlerts } from "@/lib/hooks";

type Filter = "all" | "major" | Mode;

const sevLabel = (s: string) => (s === "major" ? "Major" : s === "minor" ? "Minor" : "Info");
const sevBg = (s: string) => `rgba(${s === "major" ? "220,38,38" : s === "minor" ? "245,158,11" : "37,99,235"},.14)`;

const CHIPS: { k: Filter; label: string }[] = [
  { k: "all", label: "All" },
  { k: "subway", label: "Subway" },
  { k: "bus", label: "Bus" },
  { k: "streetcar", label: "Streetcar" },
  { k: "major", label: "Major only" },
];

export default function AlertsCenter() {
  const [filter, setFilter] = useState<Filter>("all");
  const { alerts: all, status, degraded, refreshing, refresh } = useAlerts();

  const alerts = all.filter((a) => filter === "all" || (filter === "major" ? a.sev === "major" : a.mode === filter));
  const loading = status === "loading" && all.length === 0;

  // Real summary derived from the live TTC feed (no hardcoded status).
  const majors = all.filter((a) => a.sev === "major");
  const changes = all.filter((a) => a.kind === "service-change");
  const disruptions = all.filter((a) => a.kind === "alert" || a.kind === "accessibility");
  const topRoutes = Array.from(new Set(disruptions.map((a) => a.routes.split(",")[0].trim()).filter(Boolean))).slice(0, 4);
  const summary =
    all.length === 0
      ? "All TTC service is running normally right now — no active alerts."
      : `${disruptions.length} active ${disruptions.length === 1 ? "alert" : "alerts"}${majors.length ? ` (${majors.length} major)` : ""}${topRoutes.length ? ` affecting ${topRoutes.join(", ")}` : ""}, plus ${changes.length} planned service ${changes.length === 1 ? "change" : "changes"}. Live from ttc.ca.`;

  return (
    <div className="min-h-screen pt-[94px] pb-[70px] px-[clamp(20px,5vw,64px)]">
      <div data-rv className="max-w-[1000px] mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-[5px] rounded-full text-[12px] text-white/70" style={{ border: "1px solid rgba(255,255,255,.14)" }}>
          <Bell size={13} strokeWidth={2} color="#F59E0B" />
          Service status
        </div>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h1 className="text-[34px] font-bold tracking-[-1px] mt-3.5 mb-0">Alerts</h1>
          <div className="flex items-center gap-2.5">
            <a
              href="https://www.ttc.ca/service-alerts"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-[9px] rounded-xl text-[13px] font-semibold text-white transition-transform hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg,#2563EB,#7C3AED)" }}
            >
              Official TTC alerts <ExternalLink size={14} strokeWidth={2.2} />
            </a>
            <button
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-[9px] rounded-xl text-[13px] font-semibold text-white transition-colors hover:bg-[#242424] disabled:opacity-50"
              style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,.1)" }}
            >
              <RefreshCw size={14} strokeWidth={2.2} style={refreshing ? { animation: "spin 1s linear infinite" } : undefined} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Pulse summary */}
        <div className="mt-[22px] rounded-[20px] p-5 flex gap-3.5" style={{ background: "linear-gradient(135deg, rgba(37,99,235,.12), rgba(124,58,237,.12))", border: "1px solid rgba(124,58,237,.26)" }}>
          <span className="inline-flex w-[42px] h-[42px] rounded-[13px] items-center justify-center flex-none" style={{ background: "linear-gradient(135deg,#2563EB,#7C3AED)" }}>
            <Sparkles size={20} fill="#fff" stroke="none" />
          </span>
          <div>
            <div className="text-[12px] font-mono tracking-[.6px] text-[#A78BFA] mb-[5px]">PULSE SUMMARY</div>
            <div className="text-[15px] leading-[1.55] text-white/[.82]">{summary}</div>
          </div>
        </div>

        {/* filter chips */}
        <div className="flex gap-[9px] flex-wrap mt-[22px]">
          {CHIPS.map((c) => {
            const active = filter === c.k;
            return (
              <button
                key={c.k}
                onClick={() => setFilter(c.k)}
                className="px-4 py-[9px] rounded-full text-[13px] font-semibold transition-all"
                style={active ? { background: "#fff", color: "#0A0A0A", border: "1px solid #fff" } : { background: "#111", color: "rgba(255,255,255,.7)", border: "1px solid rgba(255,255,255,.12)" }}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {degraded && status !== "loading" && (
          <div className="inline-flex items-center gap-2 mt-[18px] px-3 py-2 rounded-full text-[12px] text-white/70" style={{ border: "1px solid rgba(245,158,11,.4)" }}>
            <WifiOff size={13} strokeWidth={2} color="#F59E0B" />
            Live alerts feed unavailable — showing the latest known status.
          </div>
        )}

        {/* alert cards */}
        <div className="flex flex-col gap-3 mt-[18px]">
          {loading && (
            <div className="rounded-[18px] px-6 py-12 flex flex-col items-center gap-3" style={{ background: "#0C0C0C", border: "1px solid rgba(255,255,255,.08)" }}>
              <Loader2 size={24} strokeWidth={2} className="text-white/70" style={{ animation: "spin 1s linear infinite" }} />
              <div className="text-[14px] text-white/55">Loading service alerts…</div>
            </div>
          )}

          {!loading && alerts.map((a) => (
            <div key={a.id} className="rounded-2xl px-5 py-[18px] transition-transform hover:translate-x-[3px]" style={{ background: "#0C0C0C", border: "1px solid rgba(255,255,255,.08)", borderLeft: `4px solid ${a.color}` }}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold text-white" style={{ background: sevBg(a.sev) }}>{sevLabel(a.sev)}</span>
                  <span className="text-[16px] font-semibold">{a.title}</span>
                </div>
                <span className="font-mono text-[11.5px] text-white/40">{a.updated}</span>
              </div>
              <div className="text-[14px] leading-[1.55] text-white/60 mt-[9px]">{a.desc}</div>
              <div className="flex items-center gap-2 flex-wrap mt-3">
                <span className="inline-flex items-center gap-[7px] px-3 py-1.5 rounded-full text-[12px] text-white/70" style={{ background: "rgba(255,255,255,.05)" }}>
                  <Share2 size={13} strokeWidth={2} />
                  {a.kind === "service-change" ? "Effective for" : "Affects"} {a.routes}
                </span>
                {a.kind === "service-change" && <span className="text-[11px] px-2.5 py-1 rounded-full text-white/60" style={{ background: "rgba(37,99,235,.14)" }}>Planned change</span>}
                {a.url && (
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#A78BFA] hover:text-white transition-colors">
                    Details <ExternalLink size={12} strokeWidth={2.2} />
                  </a>
                )}
              </div>
            </div>
          ))}

          {!loading && alerts.length === 0 && (
            <div className="rounded-[18px] px-6 py-12 text-center" style={{ background: "#0C0C0C", border: "1px solid rgba(255,255,255,.08)" }}>
              <span className="inline-flex w-[54px] h-[54px] rounded-2xl items-center justify-center" style={{ background: "rgba(22,163,74,.14)" }}>
                <Check size={26} strokeWidth={2} color="#4ADE80" />
              </span>
              <div className="text-[18px] font-semibold mt-4">No major disruptions right now</div>
              <div className="text-[14px] text-white/50 mt-1.5">Nothing affecting this filter. Pulse will alert you the moment something changes.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
