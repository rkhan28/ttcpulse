import { Activity, Bus, GitBranch, Bell, Route, MapPin, Train, TramFront, Bookmark, Navigation, Sparkles } from "lucide-react";

type Cell = {
  icon: React.ReactNode;
  iconBg: string;
  iconColor?: string;
  label: string;
  tag: string;
  tagColor?: string;
  dot?: string; // live dot color
  gradient?: boolean;
};

const CELLS: Cell[] = [
  { icon: <Activity size={17} strokeWidth={2} />, iconBg: "rgba(56,189,248,.14)", iconColor: "#38BDF8", label: "GTFS-RT", tag: "FEED", dot: "#16A34A" },
  { icon: <Bus size={17} strokeWidth={2} />, iconBg: "rgba(37,99,235,.14)", iconColor: "#60A5FA", label: "Vehicles", tag: "ENTITY" },
  { icon: <GitBranch size={17} strokeWidth={2} />, iconBg: "rgba(56,189,248,.14)", iconColor: "#38BDF8", label: "Trips", tag: "FEED" },
  { icon: <Bell size={17} strokeWidth={2} />, iconBg: "rgba(245,158,11,.14)", iconColor: "#FBBF24", label: "Alerts", tag: "FEED", dot: "#F59E0B" },
  { icon: <Route size={17} strokeWidth={2} />, iconBg: "rgba(37,99,235,.14)", iconColor: "#60A5FA", label: "Routes", tag: "ENTITY" },
  { icon: <MapPin size={17} strokeWidth={2} />, iconBg: "rgba(37,99,235,.14)", iconColor: "#60A5FA", label: "Stops", tag: "ENTITY" },
  { icon: <span className="font-bold text-[13px]">1</span>, iconBg: "rgba(247,196,0,.16)", iconColor: "#F7C400", label: "Subway", tag: "MODE" },
  { icon: <Bus size={17} strokeWidth={2} />, iconBg: "rgba(215,25,32,.16)", iconColor: "#F87171", label: "Bus", tag: "MODE" },
  { icon: <TramFront size={17} strokeWidth={2} />, iconBg: "rgba(37,99,235,.16)", iconColor: "#60A5FA", label: "Streetcar", tag: "MODE" },
  { icon: <Bookmark size={17} strokeWidth={2} />, iconBg: "rgba(22,163,74,.16)", iconColor: "#4ADE80", label: "Saved Routes", tag: "YOU" },
  { icon: <Navigation size={17} strokeWidth={2} />, iconBg: "rgba(22,163,74,.16)", iconColor: "#4ADE80", label: "Nearby Stops", tag: "YOU" },
  { icon: <Sparkles size={16} fill="#fff" stroke="none" />, iconBg: "linear-gradient(135deg,#2563EB,#7C3AED)", label: "Ask Pulse", tag: "AI", tagColor: "rgba(167,139,250,.7)", gradient: true },
];

export default function DataGrid() {
  return (
    <section id="data" data-rv className="max-w-site mx-auto px-[clamp(20px,5vw,64px)] pt-[80px] pb-[70px]">
      <h2 className="text-[36px] leading-[1.1] tracking-[-1px] font-bold uppercase m-0">Built around public transit data</h2>
      <p className="text-[16px] leading-[1.6] text-white/50 mt-4 mb-9 max-w-[560px]">
        Designed for TTC riders using live feeds, route data, alerts, and commute intelligence.
      </p>
      <div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-px rounded-2xl overflow-hidden"
        style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.08)" }}
      >
        {CELLS.map((c, i) => (
          <div
            key={i}
            className={
              "relative h-[132px] p-[18px] flex flex-col justify-between transition-colors " +
              (c.gradient ? "hover:brightness-125" : "bg-[#0A0A0A] hover:bg-[#111]")
            }
            style={c.gradient ? { background: "linear-gradient(135deg, rgba(37,99,235,.1), rgba(124,58,237,.12))" } : undefined}
          >
            <span
              className="inline-flex w-8 h-8 rounded-[9px] items-center justify-center"
              style={{ background: c.iconBg, color: c.iconColor }}
            >
              {c.icon}
            </span>
            <div>
              <div className="flex items-center gap-1.5 text-[14.5px] font-semibold">
                {c.label}
                {c.dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot, boxShadow: `0 0 6px ${c.dot}`, animation: "blink 1.8s ease-in-out infinite" }} />}
              </div>
              <div className="font-mono text-[10px] tracking-[.5px]" style={{ color: c.tagColor ?? "rgba(255,255,255,.34)" }}>{c.tag}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
