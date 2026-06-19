"use client";

import Link from "next/link";
import { useState } from "react";
import { HelpCircle, Plus, ArrowUpRight } from "lucide-react";
import { FAQ } from "@/lib/data";

const chamfer = "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)";

export default function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" data-rv className="max-w-site mx-auto px-[clamp(20px,5vw,64px)] pt-[90px] pb-[100px]">
      <div className="flex flex-col items-center text-center mb-11">
        <span className="inline-flex items-center gap-2 px-[13px] py-1.5 rounded-full text-[12px] font-medium text-white/70" style={{ border: "1px solid rgba(255,255,255,.16)" }}>
          <HelpCircle size={14} strokeWidth={2} color="#D71920" />
          FAQ&apos;S
        </span>
        <h2 className="text-[42px] leading-[1.08] tracking-[-1.5px] font-bold mt-5 mb-6 max-w-[620px]">Have a commute question? Ask Pulse.</h2>
        <Link
          href="/ask"
          className="group relative overflow-hidden inline-flex items-center gap-[9px] px-6 py-[13px] rounded-xl text-[14.5px] font-semibold text-ink bg-white transition-transform hover:-translate-y-0.5"
        >
          <span className="pointer-events-none absolute top-0 left-0 h-full w-[42%]" style={{ background: "linear-gradient(100deg,transparent,rgba(0,0,0,.14),transparent)", transform: "translateX(-160%)", animation: "sheen 4.4s ease-in-out infinite" }} />
          Ask Pulse
          <ArrowUpRight size={15} strokeWidth={2} />
        </Link>
      </div>

      <div className="flex flex-col gap-3 max-w-[760px] mx-auto">
        {FAQ.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={i} style={{ background: "#0E0E0E", border: "1px solid rgba(255,255,255,.08)", clipPath: chamfer }}>
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="text-[16px] font-medium text-white">{f.q}</span>
                <span
                  className="inline-flex items-center justify-center w-6 h-6 flex-none text-white/60 transition-transform duration-[250ms]"
                  style={{ transform: isOpen ? "rotate(45deg)" : undefined }}
                >
                  <Plus size={17} strokeWidth={2} />
                </span>
              </button>
              <div
                className="grid"
                style={{
                  transition: "grid-template-rows .38s cubic-bezier(.2,.7,.2,1), opacity .32s ease",
                  gridTemplateRows: isOpen ? "1fr" : "0fr",
                  opacity: isOpen ? 1 : 0,
                }}
              >
                <div className="overflow-hidden">
                  <div className="px-6 pt-0.5 pb-[22px] text-[14.5px] leading-[1.6] text-white/50 max-w-[88%]">{f.a}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
