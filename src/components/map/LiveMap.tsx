"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Crosshair, Layers, Plus, Minus, X, Sparkles, Loader2, WifiOff, LocateFixed, ArrowRight, MapPin, Radio, Navigation } from "lucide-react";
import { ArrivalCard, ArrivalsResponse, Mode, TripDetail, TripResponse, Vehicle, VehiclesResponse } from "@/lib/data";
import { TransitGlyph } from "@/components/TransitGlyph";
import type { LatLng, MapControls } from "./LeafletMap";

interface StopHit {
  name: string;
  lat: number;
  lon: number;
  mode?: string;
}

const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false });

const modeLabel = (t: Mode) => (t === "subway" ? "Subway" : t === "streetcar" ? "Streetcar" : "Bus");

const POLL_MS = 12_000;
const TRIP_POLL_MS = 15_000;
const TORONTO: LatLng = { lat: 43.6532, lng: -79.3832 };

// Great-circle distance in km (for ordering nearby vehicles).
function distKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export default function LiveMap() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<TripDetail | null>(null);
  const [tripStatus, setTripStatus] = useState<"idle" | "loading" | "ready" | "none">("idle");
  const [filters, setFilters] = useState<Record<Mode, boolean>>({ subway: true, bus: true, streetcar: true });
  const [query, setQuery] = useState("");
  const [showLabels, setShowLabels] = useState(true);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [degraded, setDegraded] = useState(false);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [lastFetch, setLastFetch] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [from, setFrom] = useState("");
  const [dest, setDest] = useState("");

  const [stopResults, setStopResults] = useState<StopHit[]>([]);
  const [selectedStop, setSelectedStop] = useState<StopHit | null>(null);
  const [stopArrivals, setStopArrivals] = useState<{ list: ArrivalCard[]; degraded: boolean; loading: boolean }>({ list: [], degraded: false, loading: false });

  const router = useRouter();
  const controls = useRef<MapControls | null>(null);

  // Refs so intervals / callbacks always read the latest values without resetting.
  const vehiclesRef = useRef<Vehicle[]>([]);
  vehiclesRef.current = vehicles;
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;
  const userPosRef = useRef<LatLng | null>(null);
  userPosRef.current = userPos;
  // Monotonic selection token — bumped on every select/clear so late-arriving
  // trip fetches from a previous selection can detect they're stale and bail.
  const selTokenRef = useRef(0);
  // Last-known trip id of the tracked vehicle, kept fresh from polls, so the
  // trip refresh keeps working even if the vehicle leaves the nearest-N set.
  const trackedTripIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  // Reset on mount AND clear on unmount. Without the mount reset, React 18
  // StrictMode's dev double-invoke (mount → unmount → mount) would leave this
  // false forever, making every fetch bail before setState (map stuck loading).
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Poll live vehicles, nearest to the user (or downtown until we have a fix).
  // The route never throws — it returns mock data with degraded:true when the
  // live feed is down — but we still guard the network call so the panel can show
  // an error state instead of blanking.
  const loadVehicles = useCallback(async () => {
    try {
      const p = userPosRef.current;
      const q = p ? `?lat=${p.lat}&lng=${p.lng}` : "";
      const res = await fetch(`/api/vehicles${q}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data: VehiclesResponse = await res.json();
      if (!mountedRef.current) return;
      setVehicles(data.vehicles);
      setDegraded(data.degraded);
      setStatus("ready");
      setLastFetch(Date.now());
      // Keep the tracked vehicle's live position (and trip id) fresh when it's in
      // the nearest set; if it drifted out we retain the last-known values and the
      // trip refresh keeps polling by trackedTripIdRef so tracking never freezes.
      const sid = selectedIdRef.current;
      if (sid) {
        const found = data.vehicles.find((v) => v.id === sid);
        if (found) {
          setSelectedVehicle(found);
          if (found.tripId) trackedTripIdRef.current = found.tripId;
        }
      }
    } catch {
      if (!mountedRef.current) return;
      setStatus((prev) => (prev === "loading" ? "error" : prev));
      setDegraded(true);
    } finally {
      if (mountedRef.current) setFetched(true);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
    const id = setInterval(loadVehicles, POLL_MS);
    return () => clearInterval(id);
  }, [loadVehicles]);

  // Refetch immediately when the user's location first resolves, so the Nearby
  // list re-centres on them right away instead of after the next ~12s tick.
  useEffect(() => {
    if (userPos) loadVehicles();
  }, [userPos, loadVehicles]);

  // Safety net: don't let the loading overlay hang forever if tile `load` never fires.
  useEffect(() => {
    const id = setTimeout(() => setTilesLoaded(true), 6000);
    return () => clearTimeout(id);
  }, []);

  // Ticking "updated Ns" clock.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const clearSelection = useCallback(() => {
    selTokenRef.current++; // invalidate any in-flight trip fetch
    trackedTripIdRef.current = null;
    setSelectedId(null);
    setSelectedVehicle(null);
    setSelectedTrip(null);
    setTripStatus("idle");
  }, []);

  // Fetch (and periodically refresh) the tracked vehicle's live trip path. The
  // `token` pins the fetch to the selection that started it, so a response that
  // resolves after the user switched (or cleared) is dropped instead of attaching
  // one trip's path to a different vehicle.
  const loadTrip = useCallback(async (tripId: string, fit: boolean, token: number) => {
    try {
      const res = await fetch(`/api/trip?tripId=${encodeURIComponent(tripId)}`, { cache: "no-store" });
      const data: TripResponse = await res.json();
      if (selTokenRef.current !== token) return; // selection changed — stale
      setSelectedTrip(data.trip);
      setTripStatus(data.trip ? "ready" : "none");
      if (fit && data.trip) {
        const anchor = vehiclesRef.current.find((v) => v.id === selectedIdRef.current);
        const pts: [number, number][] = anchor ? [[anchor.lat, anchor.lng]] : [];
        for (const s of data.trip.stops.filter((st) => !st.passed).slice(0, 6)) pts.push([s.lat, s.lng]);
        if (pts.length > 1) controls.current?.fitTo(pts);
      }
    } catch {
      if (selTokenRef.current !== token) return;
      setSelectedTrip(null);
      setTripStatus("none");
    }
  }, []);

  // Select a vehicle from the Nearby panel → reveal it on the (otherwise empty)
  // map and start animating it along its live path.
  const select = useCallback(
    (id: string) => {
      const v = vehiclesRef.current.find((x) => x.id === id) ?? null;
      if (!v) {
        clearSelection(); // row vanished between render and click — stay clean
        return;
      }
      const token = ++selTokenRef.current;
      setSelectedId(id);
      setSelectedVehicle(v);
      setSelectedStop(null);
      setStopResults([]);
      trackedTripIdRef.current = v.tripId ?? null;
      controls.current?.panTo(v.lat, v.lng);
      setSelectedTrip(null);
      if (v.tripId) {
        setTripStatus("loading");
        loadTrip(v.tripId, true, token);
      } else {
        setTripStatus("none");
      }
    },
    [loadTrip, clearSelection]
  );

  // Refresh the tracked trip on an interval so predictions + path stay current.
  // Falls back to the last-known trip id so refresh continues even if the vehicle
  // temporarily drops out of the nearest-N set.
  useEffect(() => {
    if (!selectedId) return;
    const id = setInterval(() => {
      const cur = vehiclesRef.current.find((v) => v.id === selectedIdRef.current);
      const tid = cur?.tripId ?? trackedTripIdRef.current;
      if (tid) loadTrip(tid, false, selTokenRef.current);
    }, TRIP_POLL_MS);
    return () => clearInterval(id);
  }, [selectedId, loadTrip]);

  // Ask for the user's location and center on them.
  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const c = { lat: p.coords.latitude, lng: p.coords.longitude };
        setUserPos(c);
        setFrom((f) => f || "My location");
        controls.current?.panTo(c.lat, c.lng);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 }
    );
  }, []);

  // Prompt for location on first load.
  useEffect(() => {
    locate();
  }, [locate]);

  const toggle = (k: Mode) => setFilters((f) => ({ ...f, [k]: !f[k] }));

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) => `${v.label} ${v.line} ${v.dest} ${v.next}`.toLowerCase().includes(q));
  }, [vehicles, query]);

  const origin = userPos ?? TORONTO;
  // Nearby list, closest first — "suggested based on where you are".
  const nearby = useMemo(
    () => searched.map((v) => ({ v, km: distKm(origin, v) })).sort((a, b) => a.km - b.km),
    [searched, origin]
  );

  // Debounced stop/station search from the embedded GTFS static feed.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || selectedStop) {
      setStopResults([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stops?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setStopResults(data.stops ?? []);
      } catch {
        /* ignore */
      }
    }, 200);
    return () => clearTimeout(id);
  }, [query, selectedStop]);

  const selectStop = async (s: StopHit) => {
    setSelectedStop(s);
    setStopResults([]);
    setQuery(s.name);
    clearSelection();
    controls.current?.panTo(s.lat, s.lon);
    setStopArrivals({ list: [], degraded: false, loading: true });
    try {
      const res = await fetch(`/api/arrivals?stop=${encodeURIComponent(s.name)}`, { cache: "no-store" });
      const data: ArrivalsResponse = await res.json();
      setStopArrivals({ list: data.degraded ? [] : data.arrivals, degraded: data.degraded, loading: false });
    } catch {
      setStopArrivals({ list: [], degraded: true, loading: false });
    }
  };

  const clearStop = () => {
    setSelectedStop(null);
    setQuery("");
    setStopResults([]);
    setStopArrivals({ list: [], degraded: false, loading: false });
  };

  const recenter = () => {
    clearSelection();
    if (userPos) controls.current?.panTo(userPos.lat, userPos.lng);
    else controls.current?.recenter();
  };

  const planTrip = () => {
    const to = dest.trim();
    if (!to) return;
    const f = from.trim();
    const origin = !f || /^my location$/i.test(f) ? (userPos ? "my current location" : "downtown Toronto") : f;
    const q = `What's the fastest TTC route from ${origin} to ${to}? Give the route(s) and the next departures.`;
    router.push(`/ask?q=${encodeURIComponent(q)}`);
  };

  const updatedLabel = lastFetch ? `updated ${Math.max(0, Math.round((now - lastFetch) / 1000))}s` : "updating…";

  // Upcoming stops for the tracking panel (drop ones already behind the vehicle).
  const upcomingStops = useMemo(() => (selectedTrip ? selectedTrip.stops.filter((s) => !s.passed) : []), [selectedTrip]);
  const nextStop = upcomingStops[0];

  const overlayReady = tilesLoaded && fetched;
  const showLoading = !overlayReady;
  const showError = overlayReady && status === "error" && vehicles.length === 0;
  const showHint = overlayReady && status !== "error" && !selectedVehicle && !selectedStop;

  return (
    <div className="min-h-[100svh] lg:h-[100svh] lg:overflow-hidden flex flex-col pt-[90px] pb-4 lg:pb-5 px-[clamp(16px,4vw,48px)]">
      <div data-rv className="max-w-site w-full mx-auto flex items-end justify-between gap-5 flex-wrap mb-3 flex-none">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-[5px] rounded-full text-[12px] text-white/70" style={{ border: "1px solid rgba(255,255,255,.14)" }}>
            <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#16A34A", boxShadow: "0 0 8px #16A34A" }} />
            Live feed • Toronto
          </div>
          <h1 className="text-[34px] font-bold tracking-[-1px] mt-3.5 mb-0">Live Map</h1>
        </div>
        <Link href="/ask" className="inline-flex items-center gap-2 px-[18px] py-[11px] rounded-xl text-[13.5px] font-semibold text-white transition-colors hover:bg-[#242424]" style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,.1)" }}>
          <Sparkles size={15} fill="#fff" stroke="none" />Ask Pulse
        </Link>
      </div>

      {/* trip planner — From/To, hands off to Ask Pulse grounded in live data */}
      <div data-rv className="max-w-site w-full mx-auto mb-3 flex-none flex items-center gap-2.5 flex-wrap px-[16px] py-2.5 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(37,99,235,.1), rgba(124,58,237,.1))", border: "1px solid rgba(124,58,237,.28)" }}>
        <Sparkles size={17} fill="#A78BFA" stroke="none" className="flex-none" />
        <div className="flex-1 flex items-center gap-2.5 min-w-[220px]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="w-[9px] h-[9px] rounded-full flex-none" style={{ border: "2px solid #4ADE80" }} />
            <input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") planTrip(); }}
              placeholder="From (stop or place)"
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-white text-[14px] placeholder:text-white/45"
            />
          </div>
          <ArrowRight size={15} strokeWidth={2.2} className="text-white/40 flex-none" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="w-[9px] h-[9px] rounded-full flex-none" style={{ background: "#D71920" }} />
            <input
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") planTrip(); }}
              placeholder="To (where to?)"
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-white text-[14px] placeholder:text-white/45"
            />
          </div>
        </div>
        <button onClick={planTrip} aria-label="Plan trip" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white flex-none transition-transform hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg,#2563EB,#7C3AED)" }}>
          Plan <ArrowRight size={15} strokeWidth={2.4} />
        </button>
      </div>

      <div data-rv className="max-w-site w-full mx-auto flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-[18px]">
        {/* MAP PANEL */}
        <div className="relative h-[58vh] lg:h-full min-h-0 rounded-3xl overflow-hidden order-2 lg:order-1" style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,.1)" }}>
          <LeafletMap
            selected={selectedVehicle}
            path={selectedTrip?.stops ?? null}
            showLabels={showLabels}
            userPos={userPos}
            stopPin={selectedStop ? { lat: selectedStop.lat, lng: selectedStop.lon } : null}
            onTilesLoad={() => setTilesLoaded(true)}
            controls={controls}
          />

          {/* search + filters (top-left) */}
          <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3 flex-wrap z-[500]">
            <div className="flex flex-col gap-2.5">
              <div className="relative w-[280px] max-w-[60vw]">
                <div className="flex items-center gap-2.5 px-3.5 py-[11px] rounded-[13px]" style={{ background: "rgba(12,12,12,.82)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,.12)" }}>
                  <Search size={16} strokeWidth={2} color="rgba(255,255,255,.55)" />
                  <input
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); if (selectedStop) setSelectedStop(null); }}
                    placeholder="Search route, stop or station"
                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-white text-[13.5px] placeholder:text-white/50"
                  />
                  {(query || selectedStop) && (
                    <button onClick={clearStop} aria-label="Clear" className="text-white/45 hover:text-white">
                      <X size={14} strokeWidth={2} />
                    </button>
                  )}
                </div>
                {!selectedStop && stopResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 rounded-[13px] overflow-hidden z-[20]" style={{ background: "rgba(12,12,12,.96)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 12px 30px rgba(0,0,0,.5)" }}>
                    {stopResults.map((s, i) => (
                      <button key={`${s.name}-${i}`} onClick={() => selectStop(s)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-white/[.06]" style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                        <MapPin size={14} strokeWidth={2} color="#A78BFA" className="flex-none" />
                        <span className="text-[13px] text-white/85 truncate">{s.name}</span>
                        {s.mode && <span className="ml-auto text-[10px] uppercase tracking-wide text-white/40 flex-none">{s.mode}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {([
                  { k: "subway", label: "Subway", dot: "#F7C400" },
                  { k: "bus", label: "Bus", dot: "#D71920" },
                  { k: "streetcar", label: "Streetcar", dot: "#2563EB" },
                ] as const).map((c) => {
                  const on = filters[c.k];
                  return (
                    <button
                      key={c.k}
                      onClick={() => toggle(c.k)}
                      className="inline-flex items-center gap-[7px] px-[13px] py-2 rounded-full text-[12.5px] font-semibold transition-all"
                      style={on
                        ? { background: "#fff", color: "#0A0A0A", border: "1px solid #fff" }
                        : { background: "rgba(12,12,12,.82)", color: "rgba(255,255,255,.7)", border: "1px solid rgba(255,255,255,.14)" }}
                    >
                      <span className="w-[9px] h-[9px] rounded-full" style={{ background: c.dot }} />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {degraded ? (
                <span className="inline-flex items-center gap-[7px] px-3 py-2 rounded-full text-[12px] text-white/70" style={{ background: "rgba(12,12,12,.82)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(245,158,11,.4)" }}>
                  <WifiOff size={13} strokeWidth={2} color="#F59E0B" />
                  Demo data
                </span>
              ) : (
                <span className="inline-flex items-center gap-[7px] px-3 py-2 rounded-full text-[12px] text-white/70" style={{ background: "rgba(12,12,12,.82)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,.12)" }}>
                  <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#16A34A", boxShadow: "0 0 7px #16A34A", animation: "blink 2s ease-in-out infinite" }} />
                  Feed live
                </span>
              )}
              <span className="px-3 py-2 rounded-full font-mono text-[11.5px] text-white/55" style={{ background: "rgba(12,12,12,.82)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,.12)" }}>{updatedLabel}</span>
            </div>
          </div>

          {/* controls (bottom-right) */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-[500]">
            <button onClick={locate} aria-label="Use my location" className="w-[42px] h-[42px] rounded-xl flex items-center justify-center transition-colors hover:bg-[rgba(30,30,30,.9)]" style={{ background: "rgba(12,12,12,.85)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: `1px solid ${userPos ? "rgba(37,99,235,.6)" : "rgba(255,255,255,.12)"}`, color: userPos ? "#60A5FA" : "#fff" }}>
              <LocateFixed size={18} strokeWidth={2} style={locating ? { animation: "spin 1s linear infinite" } : undefined} />
            </button>
            <button onClick={recenter} aria-label="Recenter" className="w-[42px] h-[42px] rounded-xl flex items-center justify-center text-white transition-colors hover:bg-[rgba(30,30,30,.9)]" style={{ background: "rgba(12,12,12,.85)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,.12)" }}>
              <Crosshair size={18} strokeWidth={2} />
            </button>
            <button onClick={() => setShowLabels((s) => !s)} aria-label="Toggle map labels" aria-pressed={showLabels} className="w-[42px] h-[42px] rounded-xl flex items-center justify-center text-white transition-colors hover:bg-[rgba(30,30,30,.9)]" style={{ background: "rgba(12,12,12,.85)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: `1px solid ${showLabels ? "rgba(255,255,255,.12)" : "rgba(124,58,237,.5)"}` }}>
              <Layers size={18} strokeWidth={2} />
            </button>
            <div className="flex flex-col rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,.12)", background: "rgba(12,12,12,.85)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
              <button onClick={() => controls.current?.zoomIn()} aria-label="Zoom in" className="w-[42px] h-[38px] flex items-center justify-center text-white transition-colors hover:bg-white/[.07]" style={{ borderBottom: "1px solid rgba(255,255,255,.1)" }}>
                <Plus size={17} strokeWidth={2} />
              </button>
              <button onClick={() => controls.current?.zoomOut()} aria-label="Zoom out" className="w-[42px] h-[38px] flex items-center justify-center text-white transition-colors hover:bg-white/[.07]">
                <Minus size={17} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* tracked vehicle card (bottom-left) */}
          {selectedVehicle && (
            <div className="absolute bottom-4 left-4 w-[300px] max-w-[72vw] px-[18px] py-4 rounded-[18px] z-[500]" style={{ background: "rgba(12,12,12,.9)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 16px 40px rgba(0,0,0,.55)" }}>
              <div className="flex items-center gap-[11px]">
                <span className="inline-flex items-center justify-center gap-1.5 min-w-[38px] h-[38px] px-[11px] rounded-[11px] font-bold text-[14px]" style={{ background: selectedVehicle.color, color: selectedVehicle.tc }}>
                  <TransitGlyph mode={selectedVehicle.type} body={selectedVehicle.tc} win={selectedVehicle.color} size={16} />
                  {selectedVehicle.label}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-mono tracking-[.6px] text-white/50">{modeLabel(selectedVehicle.type)}</div>
                  <div className="text-[14.5px] font-semibold truncate">{selectedVehicle.line}</div>
                </div>
                <button onClick={clearSelection} aria-label="Close" className="w-[26px] h-[26px] rounded-lg flex items-center justify-center text-white/55 hover:bg-white/[.08] hover:text-white flex-none">
                  <X size={15} strokeWidth={2} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5 mt-3.5">
                <div className="px-3 py-2.5 rounded-[11px]" style={{ background: "rgba(255,255,255,.04)" }}>
                  <div className="text-[11px] text-white/45">Heading to</div>
                  <div className="text-[13.5px] font-semibold mt-0.5 truncate">{selectedTrip?.dest ?? selectedVehicle.dest}</div>
                </div>
                <div className="px-3 py-2.5 rounded-[11px]" style={{ background: "rgba(255,255,255,.04)" }}>
                  <div className="text-[11px] text-white/45">Next stop</div>
                  <div className="text-[13.5px] font-semibold mt-0.5 truncate">{nextStop ? nextStop.name : tripStatus === "loading" ? "Loading…" : "—"}</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: "#4ADE80" }}>
                  <Radio size={13} strokeWidth={2.4} />
                  {nextStop ? (nextStop.eta === "Due" ? "Arriving now" : `Next stop ${nextStop.eta}`) : "Live tracking"}
                </span>
                <span className="font-mono text-[11.5px] text-white/45">updated {selectedVehicle.upd}</span>
              </div>
            </div>
          )}

          {/* loading / error / hint overlays — the panel must never be blank */}
          {showLoading && (
            <div className="absolute inset-0 z-[600] flex flex-col items-center justify-center gap-3" style={{ background: "rgba(10,10,10,.82)", backdropFilter: "blur(2px)" }}>
              <Loader2 size={26} strokeWidth={2} className="text-white/80" style={{ animation: "spin 1s linear infinite" }} />
              <div className="text-[13.5px] text-white/60">Loading live Toronto map…</div>
            </div>
          )}
          {showError && (
            <div className="absolute inset-0 z-[600] flex flex-col items-center justify-center gap-2 px-8 text-center" style={{ background: "rgba(10,10,10,.86)" }}>
              <span className="inline-flex w-[54px] h-[54px] rounded-2xl items-center justify-center" style={{ background: "rgba(220,38,38,.14)" }}>
                <WifiOff size={24} strokeWidth={2} color="#F87171" />
              </span>
              <div className="text-[16px] font-semibold mt-2">Can&rsquo;t reach the live feed</div>
              <div className="text-[13.5px] text-white/50">We&rsquo;ll keep retrying. Vehicles will appear as soon as the feed responds.</div>
            </div>
          )}
          {showHint && (
            <div className="absolute inset-x-0 bottom-6 z-[550] flex justify-center pointer-events-none">
              <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full text-[13px] text-white/80" style={{ background: "rgba(12,12,12,.85)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(124,58,237,.35)", boxShadow: "0 10px 30px rgba(0,0,0,.5)" }}>
                <Navigation size={14} strokeWidth={2.2} color="#A78BFA" />
                Tap a nearby vehicle to watch it move live
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="flex flex-col gap-3.5 min-h-0 lg:h-full lg:overflow-hidden order-1 lg:order-2">
          {/* tracked-vehicle live path */}
          {selectedVehicle && (
            <div className="rounded-[20px] overflow-hidden" style={{ background: "#0C0C0C", border: "1px solid rgba(124,58,237,.3)" }}>
              <div className="flex items-center justify-between px-[18px] py-4" style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className="inline-flex items-center justify-center w-[34px] h-[34px] rounded-[10px] flex-none" style={{ background: selectedVehicle.color }}>
                    <TransitGlyph mode={selectedVehicle.type} body={selectedVehicle.tc} win={selectedVehicle.color} size={19} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-[.5px]" style={{ color: "#4ADE80" }}>
                      <Radio size={11} strokeWidth={2.6} /> Tracking live
                    </span>
                    <span className="block text-[14px] font-semibold truncate">{selectedVehicle.line}</span>
                  </span>
                </span>
                <button onClick={clearSelection} aria-label="Stop tracking" className="w-[24px] h-[24px] rounded-md flex items-center justify-center text-white/50 hover:bg-white/[.08] hover:text-white flex-none">
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
              {tripStatus === "loading" ? (
                <div className="px-[18px] py-7 flex items-center justify-center gap-2 text-[13px] text-white/50">
                  <Loader2 size={16} className="text-white/60" style={{ animation: "spin 1s linear infinite" }} /> Loading live path…
                </div>
              ) : upcomingStops.length ? (
                <div className="max-h-[300px] overflow-y-auto">
                  {upcomingStops.slice(0, 12).map((s, i) => (
                    <div key={`${s.stopId}-${i}`} className="flex items-center gap-3 px-[18px] py-[11px]" style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                      <span className="flex flex-col items-center flex-none" style={{ width: 12 }}>
                        <span className="rounded-full" style={{ width: i === 0 ? 10 : 7, height: i === 0 ? 10 : 7, background: i === 0 ? "#4ADE80" : selectedVehicle.color, boxShadow: i === 0 ? "0 0 8px #4ADE80" : "none" }} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium truncate">{s.name}</div>
                        {i === 0 && <div className="text-[11px] text-white/40">next stop</div>}
                      </div>
                      <span className="text-[13px] font-bold font-mono flex-none" style={{ color: i === 0 ? "#4ADE80" : "rgba(255,255,255,.6)" }}>{s.eta}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-[18px] py-7 text-center">
                  <div className="text-[13.5px] text-white/65 font-medium">Tracking live position</div>
                  <div className="text-[11.5px] text-white/45 mt-1.5 leading-[1.5]">No upcoming-stop predictions for this trip right now — the live dot still moves on the map.</div>
                </div>
              )}
            </div>
          )}

          {/* searched stop arrivals */}
          {selectedStop && (
            <div className="rounded-[20px] overflow-hidden" style={{ background: "#0C0C0C", border: "1px solid rgba(124,58,237,.3)" }}>
              <div className="flex items-center justify-between px-[18px] py-4" style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
                <span className="flex items-center gap-2 min-w-0">
                  <MapPin size={15} strokeWidth={2} color="#A78BFA" className="flex-none" />
                  <span className="text-[14px] font-semibold truncate">{selectedStop.name}</span>
                </span>
                <button onClick={clearStop} aria-label="Clear stop" className="w-[24px] h-[24px] rounded-md flex items-center justify-center text-white/50 hover:bg-white/[.08] hover:text-white flex-none">
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
              {stopArrivals.loading ? (
                <div className="px-[18px] py-7 flex items-center justify-center gap-2 text-[13px] text-white/50">
                  <Loader2 size={16} className="text-white/60" style={{ animation: "spin 1s linear infinite" }} /> Loading arrivals…
                </div>
              ) : stopArrivals.list.length ? (
                stopArrivals.list.map((a, i) => (
                  <div key={`${a.route}-${i}`} className="flex items-center gap-3 px-[18px] py-[13px]" style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                    <span className="inline-flex items-center justify-center min-w-[38px] h-[38px] px-2.5 rounded-[10px] font-bold text-[13px] text-white" style={{ background: a.color }}>{a.route}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{a.routeName}</div>
                      <div className="text-[11.5px] text-white/[.42]">then {a.then}</div>
                    </div>
                    <span className="text-[14px] font-bold" style={{ color: "#4ADE80" }}>{a.next}</span>
                  </div>
                ))
              ) : (
                <div className="px-[18px] py-7 text-center">
                  <div className="text-[13.5px] text-white/65 font-medium">No real-time arrivals here</div>
                  <div className="text-[11.5px] text-white/45 mt-1.5 leading-[1.5]">
                    {selectedStop.mode === "subway"
                      ? "TTC publishes no real-time subway feed — subway times aren't available."
                      : "This stop has no live trip updates right now."}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-[20px] overflow-hidden flex flex-col min-h-0 lg:flex-1 max-h-[46vh] lg:max-h-none" style={{ background: "#0C0C0C", border: "1px solid rgba(255,255,255,.09)" }}>
            <div className="flex items-center justify-between px-[18px] py-3.5 flex-none" style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              <span className="text-[14px] font-semibold">Nearby</span>
              <span className="font-mono text-[11px] text-white/40">{userPos ? "near you" : updatedLabel}</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {nearby.length === 0 ? (
                <div className="px-[18px] py-8 text-center text-[13px] text-white/45">
                  {status === "loading" ? "Loading nearby vehicles…" : "No vehicles to show right now."}
                </div>
              ) : (
                nearby.slice(0, 40).map(({ v, km }) => {
                  const dim = !filters[v.type];
                  const isSel = selectedId === v.id;
                  const dist = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
                  return (
                    <button
                      key={v.id}
                      onClick={() => select(v.id)}
                      className="w-full flex items-center gap-3 px-[18px] py-[13px] text-left transition-[background,opacity] hover:bg-white/[.04]"
                      style={{ borderBottom: "1px solid rgba(255,255,255,.05)", opacity: dim ? 0.16 : 1, ...(isSel ? { background: "rgba(124,58,237,.14)", outline: "2px solid rgba(124,58,237,.55)", outlineOffset: -2 } : {}) }}
                    >
                      <span className="inline-flex items-center justify-center gap-1.5 min-w-[38px] h-[38px] px-2.5 rounded-[10px] font-bold text-[13px]" style={{ background: v.color, color: v.tc }}>
                        <TransitGlyph mode={v.type} body={v.tc} win={v.color} size={15} />
                        {v.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{v.line}</div>
                        <div className="text-[11.5px] text-white/[.42]">{modeLabel(v.type)} • {isSel ? "tracking" : "tap to track"}</div>
                      </div>
                      <span className="text-[13px] font-semibold font-mono flex-none" style={{ color: isSel ? "#A78BFA" : "#4ADE80" }}>{dist}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <Link href="/ask" className="text-left rounded-[20px] p-[18px] flex items-center gap-[13px] transition-transform hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg, rgba(37,99,235,.16), rgba(124,58,237,.16))", border: "1px solid rgba(124,58,237,.3)" }}>
            <span className="inline-flex w-10 h-10 rounded-xl items-center justify-center flex-none" style={{ background: "linear-gradient(135deg,#2563EB,#7C3AED)" }}>
              <Sparkles size={19} fill="#fff" stroke="none" />
            </span>
            <div>
              <div className="text-[14.5px] font-semibold">Ask Pulse about this stop</div>
              <div className="text-[12.5px] text-white/55 mt-0.5">&ldquo;When&rsquo;s my next ride home?&rdquo;</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
