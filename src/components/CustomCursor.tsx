"use client";

import { useEffect } from "react";

/** White mix-blend-difference cursor dot + drives parallax CSS vars on :root. */
export default function CustomCursor() {
  useEffect(() => {
    const root = document.documentElement;
    const move = (e: PointerEvent) => {
      root.style.setProperty("--mx", e.clientX + "px");
      root.style.setProperty("--my", e.clientY + "px");
      root.style.setProperty("--px", (e.clientX / window.innerWidth - 0.5).toFixed(3));
      root.style.setProperty("--py", (e.clientY / window.innerHeight - 0.5).toFixed(3));
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  return <div aria-hidden="true" className="dc-cursor" />;
}
