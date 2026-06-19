"use client";

import { useEffect, useState } from "react";
import { BOARD_SEED, BoardSeed, BoardView, computeBoard, DEMO_MSGS } from "./data";

/** Live ticking arrivals board — decrements every second, resets near zero. */
export function useTicker(): BoardView[] {
  const [boards, setBoards] = useState<BoardSeed[]>(BOARD_SEED);

  useEffect(() => {
    const id = setInterval(() => {
      setBoards((prev) =>
        prev.map((b) => {
          let secs = b.secs - 1;
          if (secs <= 0) secs = b.base + Math.floor(Math.random() * 40 - 20);
          return { ...b, secs };
        })
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return computeBoard(boards);
}

/** Auto-playing demo chat used on the home Ask Pulse card. */
export function useDemoChat() {
  const [step, setStep] = useState(2);

  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => (s >= 10 ? 0 : s + 1));
    }, 1700);
    return () => clearInterval(id);
  }, []);

  return DEMO_MSGS.slice(0, step).map((m) => ({
    text: m.text,
    isUser: m.role === "user",
    isBot: m.role === "bot",
  }));
}

/** Tracks whether the page has scrolled past a small threshold (for nav glass). */
export function useScrolled(threshold = 24): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const s = (window.scrollY || document.documentElement.scrollTop) > threshold;
      setScrolled((prev) => (prev !== s ? s : prev));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}
