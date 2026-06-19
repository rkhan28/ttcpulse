import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/** Fixed animated transit-network hero that content slides over on scroll. */
export default function Hero() {
  return (
    <div
      data-herozoom
      className="fixed inset-0 z-0 overflow-hidden"
      style={{ background: "radial-gradient(120% 90% at 50% 0%, #0b1020 0%, #070709 52%, #050505 100%)" }}
    >
      {/* parallax network layer */}
      <div
        className="absolute"
        style={{
          inset: "-6%",
          transform: "translate(calc(var(--px,0) * -20px), calc(var(--py,0) * -16px))",
          transition: "transform .3s ease-out",
        }}
      >
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
          <defs>
            <path id="hl1" d="M120 -30 C150 270 360 440 720 450 C1080 460 1300 300 1330 -30" />
            <path id="hl2" d="M-30 480 C320 460 520 530 770 520 C1030 510 1230 450 1480 470" />
            <path id="hl3" d="M-30 740 C270 700 430 530 710 480 C990 430 1180 250 1480 200" />
            <path id="hl4" d="M-30 250 C270 300 470 360 770 360 C1070 360 1260 470 1480 550" />
            <path id="hl5" d="M330 930 C370 650 450 560 540 420 C620 300 645 150 685 -30" />
            <path id="hl6" d="M-30 610 C220 610 340 680 540 700 C780 724 930 620 1480 670" />
          </defs>
          <g stroke="rgba(255,255,255,.04)" strokeWidth="1">
            <path d="M0 150H1440M0 300H1440M0 450H1440M0 600H1440M0 750H1440M180 0V900M360 0V900M540 0V900M720 0V900M900 0V900M1080 0V900M1260 0V900" fill="none" />
          </g>
          <path d="M-30 770 C300 750 520 808 770 794 C1030 780 1250 808 1480 792 L1480 940 L-30 940 Z" fill="rgba(37,99,235,.05)" />
          <rect x="430" y="330" width="220" height="150" rx="10" fill="rgba(255,255,255,.018)" />
          <rect x="930" y="180" width="180" height="130" rx="10" fill="rgba(255,255,255,.018)" />
          <g fill="none" strokeLinecap="round">
            <use href="#hl1" stroke="#F7C400" strokeWidth="7" opacity=".14" />
            <use href="#hl2" stroke="#00923F" strokeWidth="7" opacity=".13" />
            <use href="#hl3" stroke="#D71920" strokeWidth="7" opacity=".14" />
            <use href="#hl4" stroke="#2563EB" strokeWidth="7" opacity=".13" />
            <use href="#hl1" stroke="#F7C400" strokeWidth="2.6" opacity=".82" />
            <use href="#hl2" stroke="#00923F" strokeWidth="2.6" opacity=".72" />
            <use href="#hl3" stroke="#D71920" strokeWidth="2.6" opacity=".82" />
            <use href="#hl4" stroke="#2563EB" strokeWidth="2.6" opacity=".7" />
            <use href="#hl5" stroke="#7C3AED" strokeWidth="2" opacity=".55" />
            <use href="#hl6" stroke="rgba(255,255,255,.5)" strokeWidth="1.4" opacity=".3" />
            <use href="#hl1" stroke="#fff" strokeWidth="1.3" opacity=".5" strokeDasharray="2 17">
              <animate attributeName="stroke-dashoffset" from="0" to="-200" dur="3.4s" repeatCount="indefinite" />
            </use>
            <use href="#hl3" stroke="#fff" strokeWidth="1.3" opacity=".5" strokeDasharray="2 17">
              <animate attributeName="stroke-dashoffset" from="0" to="-200" dur="4s" repeatCount="indefinite" />
            </use>
            <use href="#hl4" stroke="#fff" strokeWidth="1.3" opacity=".4" strokeDasharray="2 17">
              <animate attributeName="stroke-dashoffset" from="0" to="-200" dur="4.6s" repeatCount="indefinite" />
            </use>
          </g>
          <g fill="#0A0A0A" strokeWidth="2">
            <circle cx="720" cy="450" r="6" stroke="#fff" />
            <circle cx="770" cy="520" r="5" stroke="#00923F" />
            <circle cx="540" cy="420" r="5.5" stroke="#fff" />
            <circle cx="770" cy="360" r="5" stroke="#2563EB" />
            <circle cx="1070" cy="360" r="5" stroke="#2563EB" />
            <circle cx="430" cy="525" r="4.5" stroke="#D71920" />
            <circle cx="1180" cy="250" r="4.5" stroke="#D71920" />
            <circle cx="360" cy="437" r="4.5" stroke="#F7C400" />
            <circle cx="645" cy="150" r="4.5" stroke="#7C3AED" />
            <circle cx="220" cy="612" r="4" stroke="rgba(255,255,255,.6)" />
          </g>
          <g fill="none">
            <circle cx="720" cy="450" r="6" stroke="#fff" strokeWidth="1.5">
              <animate attributeName="r" values="6;26" dur="2.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values=".8;0" dur="2.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="770" cy="360" r="5" stroke="#2563EB" strokeWidth="1.5">
              <animate attributeName="r" values="5;22" dur="3.2s" begin="-1s" repeatCount="indefinite" />
              <animate attributeName="opacity" values=".8;0" dur="3.2s" begin="-1s" repeatCount="indefinite" />
            </circle>
            <circle cx="430" cy="525" r="5" stroke="#D71920" strokeWidth="1.5">
              <animate attributeName="r" values="5;20" dur="3s" begin="-1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values=".8;0" dur="3s" begin="-1.6s" repeatCount="indefinite" />
            </circle>
          </g>
          <g>
            <rect x="-9" y="-5" width="18" height="10" rx="4" fill="#F7C400">
              <animateMotion dur="17s" repeatCount="indefinite" rotate="auto"><mpath href="#hl1" /></animateMotion>
            </rect>
            <rect x="-9" y="-5" width="18" height="10" rx="4" fill="#F7C400" opacity=".85">
              <animateMotion dur="17s" begin="-8.5s" repeatCount="indefinite" rotate="auto"><mpath href="#hl1" /></animateMotion>
            </rect>
            <rect x="-9" y="-5" width="18" height="10" rx="4" fill="#00923F">
              <animateMotion dur="19s" begin="-4s" repeatCount="indefinite" rotate="auto"><mpath href="#hl2" /></animateMotion>
            </rect>
            <rect x="-8" y="-5" width="16" height="10" rx="3" fill="#D71920">
              <animateMotion dur="15s" begin="-3s" repeatCount="indefinite" rotate="auto"><mpath href="#hl3" /></animateMotion>
            </rect>
            <rect x="-8" y="-5" width="16" height="10" rx="5" fill="#2563EB">
              <animateMotion dur="18s" begin="-9s" repeatCount="indefinite" rotate="auto"><mpath href="#hl4" /></animateMotion>
            </rect>
            <circle r="6" fill="#7C3AED">
              <animateMotion dur="16s" begin="-2s" repeatCount="indefinite"><mpath href="#hl5" /></animateMotion>
            </circle>
          </g>
        </svg>
      </div>

      {/* drifting particles (deeper parallax) */}
      <div className="absolute inset-0" style={{ transform: "translate(calc(var(--px,0) * 34px), calc(var(--py,0) * 28px))" }}>
        {[
          { l: "18%", t: "28%", w: 3, bg: "rgba(255,255,255,.5)", d: "9s", delay: "0s" },
          { l: "72%", t: "22%", w: 4, bg: "rgba(247,196,0,.5)", d: "11s", delay: ".5s" },
          { l: "84%", t: "62%", w: 3, bg: "rgba(37,99,235,.6)", d: "10s", delay: "1s" },
          { l: "30%", t: "70%", w: 2.5, bg: "rgba(255,255,255,.4)", d: "13s", delay: ".2s" },
          { l: "54%", t: "40%", w: 3, bg: "rgba(215,25,32,.55)", d: "12s", delay: "1.4s" },
          { l: "12%", t: "54%", w: 3.5, bg: "rgba(255,255,255,.35)", d: "14s", delay: ".8s" },
          { l: "64%", t: "80%", w: 2.5, bg: "rgba(124,58,237,.6)", d: "10.5s", delay: ".3s" },
          { l: "90%", t: "38%", w: 3, bg: "rgba(255,255,255,.4)", d: "12.5s", delay: "1.1s" },
        ].map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{ left: p.l, top: p.t, width: p.w, height: p.w, background: p.bg, animation: `drift ${p.d} ease-in-out infinite ${p.delay}` }}
          />
        ))}
      </div>

      {/* readability overlay */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(5,5,5,.42) 0%, rgba(5,5,5,.1) 40%, rgba(5,5,5,.92) 100%)" }} />

      {/* hero content bottom */}
      <div
        data-heroout
        className="absolute left-0 right-0 bottom-0 z-[5] flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between md:gap-[30px] px-[clamp(20px,5vw,64px)] pb-[clamp(40px,6vh,64px)]"
      >
        <h1 className="text-[42px] leading-[1.08] font-bold uppercase tracking-[-.5px] m-0 max-w-[680px]">
          Live TTC intelligence for every ride
          <span className="inline-block w-[11px] h-[11px] rounded-full bg-ttc-red ml-[10px] align-baseline" />
        </h1>
        <Link
          href="/ask"
          className="relative flex-none inline-flex items-center gap-[9px] px-6 py-[13px] rounded-full text-[14.5px] font-semibold text-white transition-[background,border-color,transform] duration-200 hover:bg-white/[.12] hover:-translate-y-0.5"
          style={{ border: "1px solid rgba(255,255,255,.22)", background: "rgba(255,255,255,.05)" }}
        >
          <span className="pointer-events-none absolute inset-0 rounded-full" style={{ border: "1px solid rgba(255,255,255,.4)", animation: "ringExpand 2.8s ease-out infinite" }} />
          Ask Pulse
          <ArrowUpRight size={15} strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}
