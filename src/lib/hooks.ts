"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ALERTS,
  AlertItem,
  AlertsResponse,
  ArrivalCard,
  ArrivalsResponse,
  BOARD_SEED,
  BoardSeed,
  BoardView,
  computeBoard,
  DEMO_MSGS,
  VehiclesResponse,
} from "./data";

/** Maps a live arrival card to the ticking-board seed shape. */
function arrivalToSeed(a: ArrivalCard, i: number): BoardSeed {
  const n = a.next.toLowerCase();
  const secs = n.includes("due") ? 20 : (parseInt(n, 10) || 2) * 60;
  return { id: `${a.route}-${i}`, badge: a.route, color: a.color, mode: "", dest: a.routeName, dir: a.direction, base: secs, secs };
}

/**
 * Live ticking arrivals board. Polls /api/arrivals and decrements every second.
 * Falls back to the mock seed whenever the feed is degraded so the visual design
 * is unchanged until real live arrivals are available.
 */
export function useTicker(stop = "Finch West Station"): BoardView[] {
  const [boards, setBoards] = useState<BoardSeed[]>(BOARD_SEED);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/arrivals?stop=${encodeURIComponent(stop)}`, { cache: "no-store" });
        if (!res.ok) return;
        const data: ArrivalsResponse = await res.json();
        if (!active || data.degraded || !data.arrivals.length) return; // keep mock seed
        setBoards(data.arrivals.map(arrivalToSeed));
      } catch {
        /* keep current boards */
      }
    };
    load();
    const id = setInterval(load, 12_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [stop]);

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

export interface BoardItem {
  id: string;
  badge: string;
  color: string;
  tcol: string;
  dest: string;
  sub: string;
}

const DOWNTOWN = { lat: 43.6532, lng: -79.3832 };

/** Live in-service vehicles nearest downtown, for the "Smart arrivals" panel. */
export function useLiveBoard(): BoardItem[] {
  const [items, setItems] = useState<BoardItem[]>(() =>
    BOARD_SEED.map((b) => ({
      id: b.id,
      badge: b.badge,
      color: b.color,
      tcol: b.color === "#F7C400" ? "#1F2937" : "#fff",
      dest: b.dest,
      sub: b.dir,
    }))
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/vehicles", { cache: "no-store" });
        if (!res.ok) return;
        const data: VehiclesResponse = await res.json();
        if (!active || data.degraded || !data.vehicles.length) return;
        const top = [...data.vehicles]
          .sort((a, b) => (a.lat - DOWNTOWN.lat) ** 2 + (a.lng - DOWNTOWN.lng) ** 2 - ((b.lat - DOWNTOWN.lat) ** 2 + (b.lng - DOWNTOWN.lng) ** 2))
          .slice(0, 6)
          .map((v) => ({ id: v.id, badge: v.label, color: v.color, tcol: v.tc, dest: v.line, sub: v.status }));
        if (top.length) setItems(top);
      } catch {
        /* keep current */
      }
    };
    load();
    const id = setInterval(load, 12_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return items;
}

export interface AlertsState {
  alerts: AlertItem[];
  status: "loading" | "ready" | "error";
  degraded: boolean;
  refreshing: boolean;
  refresh: () => void;
}

/** Polls /api/alerts (~15s), with a manual refresh, falling back to mock on failure. */
export function useAlerts(): AlertsState {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [degraded, setDegraded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // `fresh` forces the server to re-scrape ttc.ca (used by the manual Refresh);
  // the background poll uses the short server cache.
  const load = useCallback(async (fresh = false) => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/alerts${fresh ? "?fresh=1" : ""}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data: AlertsResponse = await res.json();
      setAlerts(data.alerts);
      setStatus("ready");
      setDegraded(data.degraded);
    } catch {
      setAlerts((a) => (a.length ? a : ALERTS));
      setStatus("error");
      setDegraded(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [load]);

  return { alerts, status, degraded, refreshing, refresh: () => load(true) };
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
