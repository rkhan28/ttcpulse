import { Plus, Pencil, Trash2, Sparkles, ListFilter } from "lucide-react";
import { SAVED_ROUTES } from "@/lib/data";

export const metadata = { title: "Routes — TTC Pulse" };

const riskColor = (risk: string) => (risk === "Low" ? "#16A34A" : risk === "Medium" ? "#F59E0B" : "#DC2626");

export default function RoutesPage() {
  return (
    <div className="min-h-screen pt-[94px] pb-[70px] px-[clamp(20px,5vw,64px)]">
      <div data-rv className="max-w-site mx-auto">
        <div className="flex items-end justify-between gap-5 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-[5px] rounded-full text-[12px] text-white/70" style={{ border: "1px solid rgba(255,255,255,.14)" }}>
              <ListFilter size={13} strokeWidth={2} color="#16A34A" />
              Saved commutes
            </div>
            <h1 className="text-[34px] font-bold tracking-[-1px] mt-3.5 mb-0">Your routes</h1>
            <p className="text-[15.5px] text-white/55 mt-2.5 max-w-[480px]">Pulse watches these before you leave and flags anything worth knowing.</p>
          </div>
          <button className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-[14px] font-semibold text-ink bg-white transition-transform hover:-translate-y-0.5">
            <Plus size={16} strokeWidth={2.2} />Add commute
          </button>
        </div>
      </div>

      <div data-rv className="max-w-site mx-auto mt-7 grid gap-[18px]" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))" }}>
        {SAVED_ROUTES.map((r) => (
          <div key={r.id} className="relative rounded-[22px] overflow-hidden transition-[transform,border-color] hover:-translate-y-1" style={{ background: "#0C0C0C", border: "1px solid rgba(255,255,255,.09)" }}>
            <div className="h-1" style={{ background: r.color }} />
            <div className="p-5">
              <div className="flex items-center gap-[11px]">
                <span className="inline-flex items-center justify-center min-w-[42px] h-[42px] px-3 rounded-[11px] font-bold text-[15px] text-white" style={{ background: r.color }}>{r.badge}</span>
                <div className="flex-1">
                  <div className="text-[11px] font-mono tracking-[.5px] text-white/45">{r.mode}</div>
                  <div className="text-[16px] font-semibold">{r.name}</div>
                </div>
                <div className="flex gap-1">
                  <button aria-label="Edit" className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-white/45 hover:bg-white/[.08] hover:text-white">
                    <Pencil size={15} strokeWidth={2} />
                  </button>
                  <button aria-label="Delete" className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-white/45 hover:bg-[rgba(220,38,38,.15)] hover:text-[#F87171]">
                    <Trash2 size={15} strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-[9px] mt-4 text-[13.5px] text-white/60">
                <span className="w-2 h-2 rounded-full" style={{ border: "2px solid rgba(255,255,255,.4)" }} />
                {r.from}
              </div>
              <div className="w-0.5 h-3.5 ml-[3px]" style={{ background: "rgba(255,255,255,.12)" }} />
              <div className="flex items-center gap-[9px] text-[13.5px] text-white/85 font-medium">
                <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                {r.to}
              </div>

              <div className="grid grid-cols-3 gap-2 mt-[18px]">
                <div className="p-2.5 rounded-[11px] text-center" style={{ background: "rgba(255,255,255,.04)" }}>
                  <div className="text-[11px] text-white/[.42]">Usual</div>
                  <div className="text-[14px] font-semibold mt-0.5">{r.time}</div>
                </div>
                <div className="p-2.5 rounded-[11px] text-center" style={{ background: "rgba(255,255,255,.04)" }}>
                  <div className="text-[11px] text-white/[.42]">Next</div>
                  <div className="text-[14px] font-bold mt-0.5" style={{ color: "#4ADE80" }}>{r.next}</div>
                </div>
                <div className="p-2.5 rounded-[11px] text-center" style={{ background: "rgba(255,255,255,.04)" }}>
                  <div className="text-[11px] text-white/[.42]">Risk</div>
                  <div className="text-[14px] font-semibold mt-0.5" style={{ color: riskColor(r.risk) }}>{r.risk}</div>
                </div>
              </div>

              <div className="flex items-start gap-[9px] mt-3.5 px-[13px] py-3 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(37,99,235,.1), rgba(124,58,237,.1))", border: "1px solid rgba(124,58,237,.22)" }}>
                <Sparkles size={15} fill="#A78BFA" stroke="none" className="flex-none mt-px" />
                <span className="text-[12.5px] leading-[1.45] text-white/[.72]">{r.tip}</span>
              </div>
            </div>
          </div>
        ))}

        {/* empty-state add card */}
        <button className="rounded-[22px] min-h-[200px] flex flex-col items-center justify-center gap-3 text-white/50 transition-[border-color,color,background] hover:border-white/40 hover:text-white hover:bg-white/[.02]" style={{ background: "transparent", border: "1.5px dashed rgba(255,255,255,.16)" }}>
          <span className="inline-flex w-[46px] h-[46px] rounded-[14px] items-center justify-center" style={{ background: "rgba(255,255,255,.06)" }}>
            <Plus size={22} strokeWidth={2} />
          </span>
          <div className="text-center">
            <div className="text-[15px] font-semibold">Add a commute</div>
            <div className="text-[12.5px] text-white/40 mt-0.5">Pulse will watch it for you</div>
          </div>
        </button>
      </div>
    </div>
  );
}
