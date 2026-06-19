import Link from "next/link";
import { Mail, Code2, ArrowUpRight } from "lucide-react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Live Map" },
  { href: "/routes", label: "Routes" },
  { href: "/alerts", label: "Alerts" },
  { href: "/ask", label: "Ask Pulse" },
];

export default function Footer() {
  return (
    <footer data-rv className="px-[clamp(20px,5vw,64px)] pt-12" style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
      <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between max-w-site mx-auto">
        <div className="flex gap-2.5">
          {[
            { label: "Email", icon: <Mail size={17} strokeWidth={2} /> },
            { label: "Code", icon: <Code2 size={17} strokeWidth={2} /> },
            {
              label: "X",
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25h6.83l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              ),
            },
          ].map((s) => (
            <a key={s.label} href="#top" aria-label={s.label} className="inline-flex w-[42px] h-[42px] rounded-[11px] items-center justify-center text-white/70 transition-colors hover:bg-white/[.06]" style={{ border: "1px solid rgba(255,255,255,.16)" }}>
              {s.icon}
            </a>
          ))}
        </div>

        <div className="hidden md:flex gap-7 text-[14px] text-white/60">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-white transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        <Link href="/map" className="inline-flex items-center gap-2 px-5 py-[11px] rounded-full text-[13.5px] font-semibold text-ink bg-white transition-transform hover:-translate-y-px">
          Open app
          <ArrowUpRight size={14} strokeWidth={2.2} />
        </Link>
      </div>
      <div className="h-10" />
    </footer>
  );
}
