"use client";

import { useEffect } from "react";

/** Drives the hero parallax CSS vars (--px/--py) from pointer movement. */
export default function HeroParallax() {
  useEffect(() => {
    const root = document.documentElement;
    const move = (e: PointerEvent) => {
      root.style.setProperty("--px", (e.clientX / window.innerWidth - 0.5).toFixed(3));
      root.style.setProperty("--py", (e.clientY / window.innerHeight - 0.5).toFixed(3));
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  return null;
}
