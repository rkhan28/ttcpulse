"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { useScrolled } from "@/lib/hooks";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Live Map" },
  { href: "/routes", label: "Routes" },
  { href: "/alerts", label: "Alerts" },
  { href: "/ask", label: "Ask Pulse" },
];

export default function Nav() {
  const pathname = usePathname();
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = pathname === "/";
  const glass = !isHome || scrolled;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between px-[clamp(20px,5vw,64px)] py-[18px] transition-[background,backdrop-filter] duration-300"
        style={
          glass
            ? {
                background: "rgba(10,12,20,.5)",
                backdropFilter: "blur(22px) saturate(180%)",
                WebkitBackdropFilter: "blur(22px) saturate(180%)",
                borderBottom: "1px solid rgba(255,255,255,.1)",
                boxShadow: "0 10px 34px rgba(0,0,0,.35)",
              }
            : undefined
        }
      >
        <Link href="/" className="flex items-center gap-[10px] font-extrabold text-[18px] tracking-[1.5px] text-white">
          <span className="relative inline-flex w-[11px] h-[11px]">
            <span className="absolute -inset-1 rounded-full" style={{ background: "rgba(215,25,32,.4)", animation: "pulseRing 2.6s ease-out infinite" }} />
            <span className="relative w-[11px] h-[11px] rounded-full bg-ttc-red" />
          </span>
          TTC&nbsp;PULSE
        </Link>

        <div className="hidden md:flex items-center gap-[6px] text-[14px] font-medium">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-[15px] py-2 rounded-[10px] transition-colors hover:text-white hover:bg-white/[.06]"
              style={isActive(l.href) ? { color: "#fff", background: "rgba(255,255,255,.08)" } : { color: "rgba(255,255,255,.7)" }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-[10px]">
          <Link
            href="/map"
            className="group relative overflow-hidden inline-flex items-center gap-[7px] px-5 py-[10px] rounded-full text-[13.5px] font-semibold text-ink bg-white transition-transform hover:-translate-y-px"
          >
            <span className="pointer-events-none absolute top-0 left-0 h-full w-[42%]" style={{ background: "linear-gradient(100deg,transparent,rgba(0,0,0,.16),transparent)", transform: "translateX(-160%)", animation: "sheen 4.2s ease-in-out infinite" }} />
            Open app
            <ArrowUpRight size={14} strokeWidth={2.2} />
          </Link>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className="md:hidden w-[42px] h-[42px] rounded-[11px] flex items-center justify-center border border-white/[.16] text-white"
          >
            {menuOpen ? <X size={20} strokeWidth={2.2} /> : <Menu size={20} strokeWidth={2.2} />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div
          className="md:hidden fixed top-[74px] left-0 right-0 z-[59] mx-[clamp(20px,5vw,64px)] p-[10px] rounded-[18px] flex flex-col gap-[2px]"
          style={{ background: "rgba(10,10,10,.96)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,.1)" }}
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="text-left px-[14px] py-[13px] rounded-[11px] text-[15px] font-medium text-white hover:bg-white/[.06]"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
