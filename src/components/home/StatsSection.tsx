import Link from "next/link";
import { Activity, Clock, ArrowRight } from "lucide-react";

const chamfer = "polygon(0 0, calc(100% - 26px) 0, 100% 26px, 100% 100%, 0 100%)";

export default function StatsSection() {
  return (
    <section data-unravel className="max-w-site mx-auto px-[clamp(20px,5vw,64px)] pt-[110px] pb-[70px]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-2 px-[13px] py-1.5 rounded-full text-[12px] font-medium text-white/70" style={{ border: "1px solid rgba(255,255,255,.16)" }}>
            <span className="w-[7px] h-[7px] rounded-full bg-ttc-red" />
            Live System
          </span>
          <h2 className="text-[48px] leading-[1.05] tracking-[-1.5px] font-bold mt-[22px] mb-0">Live transit, simplified</h2>
          <p className="text-[17px] leading-[1.6] text-white/55 mt-[18px] max-w-[430px]">
            Track TTC vehicles, arrivals, alerts, and saved routes from one clean command center.
          </p>
          <Link
            href="/map"
            className="group relative overflow-hidden inline-flex items-center gap-[9px] mt-7 px-[22px] py-[13px] rounded-xl text-[14.5px] font-semibold text-white transition-[background,transform] hover:-translate-y-0.5"
            style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,.1)" }}
          >
            <span className="pointer-events-none absolute top-0 left-0 h-full w-[45%]" style={{ background: "linear-gradient(100deg,transparent,rgba(255,255,255,.14),transparent)", transform: "translateX(-160%)", animation: "sheen 4.5s ease-in-out infinite" }} />
            Open live map
            <ArrowRight size={15} strokeWidth={2} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="h-[230px] p-[26px] flex flex-col justify-between" style={{ background: "#0E0E0E", border: "1px solid rgba(255,255,255,.08)", clipPath: chamfer }}>
            <Activity size={26} strokeWidth={2} color="#D71920" />
            <div>
              <div className="text-[26px] font-bold tracking-[-.5px]">Real-time</div>
              <div className="text-[15px] text-white/45 mt-0.5">Vehicles</div>
            </div>
          </div>
          <div className="h-[230px] p-[26px] flex flex-col justify-between" style={{ background: "#0E0E0E", border: "1px solid rgba(255,255,255,.08)", clipPath: chamfer }}>
            <Clock size={26} strokeWidth={2} color="#2563EB" />
            <div>
              <div className="text-[26px] font-bold tracking-[-.5px]">Smart</div>
              <div className="text-[15px] text-white/45 mt-0.5">Arrivals</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
