// Server-only TTC GTFS-Realtime data layer.
// Fetches the protobuf feeds, decodes them, maps to the app's TS types, and
// caches results for ~10s. Callers handle the mock fallback on failure.
import "server-only";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import type { Vehicle, AlertItem, ArrivalCard, Mode, TripDetail, TripStop } from "./data";
import { resolveStopIds, routeInfo, routeMode, stopById } from "./gtfs-static";
import { getServiceAlerts } from "./ttc-alerts";

const { transit_realtime } = GtfsRealtimeBindings;
type FeedEntity = NonNullable<ReturnType<typeof transit_realtime.FeedMessage.decode>["entity"]>[number];

export const CACHE_TTL_MS = 10_000;
const FEED_TIMEOUT_MS = 15_000; // TTC feeds can be slow; avoid false "unavailable"
const MAX_CACHE_KEYS = 400; // bound the per-trip/per-stop cache so it can't grow unbounded

// Greater Toronto bounding box — drops stray/garage coordinates from the feed
// that would otherwise fling the map far outside the service area.
const GTA = { minLat: 43.4, maxLat: 44.1, minLng: -79.95, maxLng: -79.0 };
function inGTA(lat: number, lng: number): boolean {
  return lat >= GTA.minLat && lat <= GTA.maxLat && lng >= GTA.minLng && lng <= GTA.maxLng;
}

interface CacheEntry<T> {
  value: T;
  expires: number;
}
const cache = new Map<string, CacheEntry<unknown>>();

async function cached<T>(key: string, producer: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await producer();
  // Bound the map so per-stop / per-trip keys can't accumulate unbounded. Drop
  // expired entries first; if a burst of still-fresh distinct keys keeps it over
  // the cap, evict oldest-inserted (Map preserves insertion order) until under.
  if (cache.size > MAX_CACHE_KEYS) {
    const now = Date.now();
    for (const [k, entry] of cache) if (entry.expires <= now) cache.delete(k);
    while (cache.size > MAX_CACHE_KEYS) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
  }
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
  return value;
}

async function fetchFeed(url: string): Promise<FeedEntity[]> {
  let lastErr: unknown;
  // One quick retry — the TTC feeds occasionally drop a connection mid-handshake.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; TTC-Pulse)" },
      });
      if (!res.ok) throw new Error(`GTFS-RT feed ${url} returned ${res.status}`);
      const buf = await res.arrayBuffer();
      const feed = transit_realtime.FeedMessage.decode(new Uint8Array(buf));
      return feed.entity ?? [];
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

function envUrl(name: string): string {
  const url = process.env[name];
  if (!url) throw new Error(`Missing env var ${name}`);
  return url;
}

// ---- route classification -------------------------------------------------

const STREETCAR = new Set([501, 503, 504, 505, 506, 508, 509, 510, 511, 512, 301, 304, 305, 306, 310]);
const SUBWAY: Record<string, { color: string; tc: string; line: string }> = {
  "1": { color: "#F7C400", tc: "#1F2937", line: "Line 1 Yonge–University" },
  "2": { color: "#00923F", tc: "#fff", line: "Line 2 Bloor–Danforth" },
  "3": { color: "#0098A8", tc: "#fff", line: "Line 3 Scarborough" },
  "4": { color: "#A21A68", tc: "#fff", line: "Line 4 Sheppard" },
};

interface Classified {
  type: Mode;
  color: string;
  tc: string;
  line: string;
  label: string;
}

function classify(routeId: string): Classified {
  const id = (routeId || "").trim();
  const info = routeInfo(id);
  const label = info?.short || id || "?";

  // Prefer the real GTFS route_type; fall back to heuristics when static data
  // (the seed) doesn't know this route.
  const heuristic =
    SUBWAY[label] || SUBWAY[id] ? "subway" : !Number.isNaN(parseInt(label, 10)) && STREETCAR.has(parseInt(label, 10)) ? "streetcar" : "bus";
  const type = (routeMode(id) ?? heuristic) as Mode;

  if (type === "subway") {
    const known = SUBWAY[label] || SUBWAY[id];
    return {
      type,
      color: known?.color || (info?.color ? `#${info.color}` : "#6B7280"),
      tc: known?.tc || "#fff",
      line: info?.long || known?.line || `Line ${label}`,
      label,
    };
  }
  if (type === "streetcar") {
    return { type, color: "#2563EB", tc: "#fff", line: info?.long || `${label} Streetcar`, label };
  }
  return { type: "bus", color: "#D71920", tc: "#fff", line: info?.long || `${label} Bus`, label };
}

function text(t: { translation?: { text?: string | null }[] | null } | null | undefined): string {
  return t?.translation?.[0]?.text ?? "";
}

function ago(timestampSec?: number | Long | null): string {
  if (timestampSec == null) return "live";
  const secs = typeof timestampSec === "number" ? timestampSec : Number(timestampSec);
  const delta = Math.max(0, Math.round(Date.now() / 1000 - secs));
  if (delta < 60) return `${delta}s`;
  return `${Math.round(delta / 60)}m`;
}

// gtfs-realtime-bindings returns Long for 64-bit fields; narrow loosely.
type Long = { toNumber(): number };

// ---- public API -----------------------------------------------------------

// Last successfully-decoded vehicle set, kept so a brief TTC feed outage serves
// slightly-stale REAL positions instead of collapsing to the tiny mock set.
let lastGoodVehicles: { at: number; value: Vehicle[] } | null = null;
const LAST_GOOD_MAX_AGE_MS = 5 * 60_000;

export async function getVehicles(): Promise<Vehicle[]> {
  try {
    return await getVehiclesLive();
  } catch (err) {
    if (lastGoodVehicles && Date.now() - lastGoodVehicles.at < LAST_GOOD_MAX_AGE_MS) {
      console.warn("vehicles feed failed; serving last-good positions:", err);
      return lastGoodVehicles.value;
    }
    throw err;
  }
}

async function getVehiclesLive(): Promise<Vehicle[]> {
  return cached("vehicles", async () => {
    const entities = await fetchFeed(envUrl("TTC_GTFS_RT_VEHICLES"));
    const vehicles: Vehicle[] = [];
    for (const e of entities) {
      const v = e.vehicle;
      const pos = v?.position;
      if (!v || !pos || pos.latitude == null || pos.longitude == null) continue;
      if (!inGTA(pos.latitude, pos.longitude)) continue; // drop stray/garage coords
      const routeId = v.trip?.routeId ?? "";
      if (!routeId) continue; // not in service (no assigned route) — skip
      const c = classify(routeId);
      const seq = v.currentStopSequence;
      vehicles.push({
        // Fleet number is stable + unique across polls; entity id is a volatile
        // sequential index, so we must key on the fleet number to track a vehicle.
        id: v.vehicle?.id || e.id || `${routeId}-${pos.latitude},${pos.longitude}`,
        type: c.type,
        label: c.label,
        color: c.color,
        tc: c.tc,
        lat: pos.latitude,
        lng: pos.longitude,
        bearing: pos.bearing ?? undefined,
        line: c.line,
        dest: c.line,
        next: "—",
        eta: "live",
        upd: ago(v.timestamp as number | Long | null | undefined),
        status: "On time",
        routeId: routeId || undefined,
        tripId: v.trip?.tripId ?? undefined,
        seq: seq == null ? undefined : Number(seq),
        speed: pos.speed == null ? undefined : Number(pos.speed),
        occupancy: v.occupancyStatus != null ? String(v.occupancyStatus) : undefined,
      });
    }
    // Return the full in-GTA set (~1.5k). The route handler slices to the
    // nearest N to the caller's location so the "Nearby" panel is accurate
    // wherever the user is, not just downtown.
    if (vehicles.length) lastGoodVehicles = { at: Date.now(), value: vehicles };
    return vehicles;
  });
}

// Nearest `limit` vehicles to a point, closest first. Used by /api/vehicles so
// the Nearby list reflects the user's actual location. Longitude is scaled by
// cos(latitude) so a degree of longitude and a degree of latitude are compared
// on the same km footing (at Toronto's ~43.7°, 1° lng ≈ 0.72° lat of ground
// distance); without this the ranking over-weights east-west separation.
export function nearestVehicles(vehicles: Vehicle[], center: { lat: number; lng: number }, limit: number): Vehicle[] {
  const kx = Math.cos((center.lat * Math.PI) / 180);
  const d2 = (v: Vehicle) => (v.lat - center.lat) ** 2 + ((v.lng - center.lng) * kx) ** 2;
  return [...vehicles].sort((a, b) => d2(a) - d2(b)).slice(0, limit);
}

function severity(level?: number | null, effect?: number | null): AlertItem["sev"] {
  const S = transit_realtime.Alert.SeverityLevel;
  if (level === S.SEVERE) return "major";
  if (level === S.WARNING) return "minor";
  const E = transit_realtime.Alert.Effect;
  if (effect === E.NO_SERVICE || effect === E.SIGNIFICANT_DELAYS) return "major";
  if (effect === E.REDUCED_SERVICE || effect === E.DETOUR) return "minor";
  return "info";
}

const SEV_COLOR: Record<AlertItem["sev"], string> = { major: "#DC2626", minor: "#F59E0B", info: "#2563EB" };

// Returns a human effect label, or null when the feed leaves it unset/generic
// (TTC usually does) so we can fall back to summarizing the description.
function effectLabel(effect?: number | null): string | null {
  const E = transit_realtime.Alert.Effect;
  switch (effect) {
    case E.NO_SERVICE: return "No service";
    case E.REDUCED_SERVICE: return "Reduced service";
    case E.SIGNIFICANT_DELAYS: return "Major delays";
    case E.DETOUR: return "Detour";
    case E.ADDITIONAL_SERVICE: return "Added service";
    case E.MODIFIED_SERVICE: return "Service change";
    case E.STOP_MOVED: return "Stop moved";
    case E.ACCESSIBILITY_ISSUE: return "Accessibility";
    default: return null;
  }
}

// Derive a short, clean title fragment from a full alert description:
// "506 Carlton: Detour via Ossington Ave, Dundas St W…" -> "Detour via Ossington Ave".
function summarize(desc: string): string {
  let s = desc.trim();
  const colon = s.indexOf(": ");
  if (colon >= 0 && colon < 40) s = s.slice(colon + 2); // drop "Route name:" prefix
  s = s.split(/,| due to | because | between /i)[0].trim(); // first clause only
  if (s.length > 60) {
    s = s.slice(0, 60);
    const sp = s.lastIndexOf(" ");
    if (sp > 30) s = s.slice(0, sp);
    s += "…";
  }
  return s || desc.slice(0, 50);
}

// Generic, non-disruption notices we don't want cluttering the alerts list.
const NOISE = /proof of payment|fare inspect|present.*fare|valid proof/i;

// Trim a route long-name to just the short route number (the first token).
const shortRoute = (id: string) => id.trim().split(/\s|:/)[0] || id;

// Prefer the OFFICIAL ttc.ca alerts feed (matches the website exactly, incl.
// service changes + accessibility). Fall back to the GTFS-RT alerts feed only if
// the official API is unreachable so alerts never blank out.
export async function getAlerts(force = false): Promise<AlertItem[]> {
  try {
    const official = await getServiceAlerts(force);
    if (official.length) return official;
  } catch (err) {
    console.error("official TTC alerts failed, falling back to GTFS-RT:", err);
  }
  return getAlertsRT();
}

async function getAlertsRT(): Promise<AlertItem[]> {
  return cached("alerts", async () => {
    const entities = await fetchFeed(envUrl("TTC_GTFS_RT_ALERTS"));
    const alerts: AlertItem[] = [];
    const seen = new Set<string>();

    for (const e of entities) {
      const a = e.alert;
      if (!a) continue;

      const header = text(a.headerText).trim();
      const desc = (text(a.descriptionText) || header).trim();
      if (!desc) continue;
      if (NOISE.test(header) || NOISE.test(desc)) continue; // drop fare/proof-of-payment notices

      const routes = Array.from(
        new Set((a.informedEntity ?? []).map((ie) => shortRoute(ie.routeId ?? "")).filter(Boolean))
      ) as string[];
      const sev = severity(a.severityLevel, a.effect);
      const c = classify(routes[0] ?? "");
      const summary = effectLabel(a.effect) ?? summarize(desc);

      // Build a clean, human title: "506 — Detour via Ossington Ave".
      const title = routes.length ? `${routes.join(", ")} — ${summary}` : header || summary;

      const dedupeKey = `${title}|${desc}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const start = a.activePeriod?.[0]?.start;
      alerts.push({
        id: e.id || `alert-${alerts.length}`,
        sev,
        mode: c.type,
        color: SEV_COLOR[sev],
        title,
        routes: routes.length ? routes.join(", ") : "TTC network",
        desc,
        updated: start != null ? `${ago(start as number | Long)} ago` : "now",
      });
    }

    // Major first, then minor, then info.
    const rank = { major: 0, minor: 1, info: 2 } as const;
    alerts.sort((x, y) => rank[x.sev] - rank[y.sev]);
    return alerts;
  });
}

// Real arrivals for a human stop/station name: resolve the name to GTFS stop IDs
// via the static feed, then read the live trip-updates feed for those IDs.
// Returns [] when the name can't be resolved or has no real-time data (e.g.
// subway stations — TTC doesn't publish subway trip updates).
export async function getArrivals(stop: string): Promise<ArrivalCard[]> {
  return cached(`arrivals:${stop.trim().toLowerCase()}`, async () => {
    const ids = new Set(resolveStopIds(stop));
    if (ids.size === 0) return [];

    const entities = await fetchFeed(envUrl("TTC_GTFS_RT_TRIPS"));
    const nowSec = Date.now() / 1000;
    type Pending = { route: string; etas: number[] };
    const byRoute = new Map<string, Pending>();

    for (const e of entities) {
      const tu = e.tripUpdate;
      if (!tu) continue;
      const routeId = tu.trip?.routeId ?? "";
      for (const stu of tu.stopTimeUpdate ?? []) {
        if (!stu.stopId || !ids.has(stu.stopId)) continue;
        const t = stu.arrival?.time ?? stu.departure?.time;
        if (t == null) continue;
        const etaMin = Math.max(0, Math.round((Number(t) - nowSec) / 60));
        const p = byRoute.get(routeId) ?? { route: routeId, etas: [] };
        p.etas.push(etaMin);
        byRoute.set(routeId, p);
      }
    }

    const cards: ArrivalCard[] = [];
    for (const p of byRoute.values()) {
      const etas = p.etas.sort((a, b) => a - b);
      const c = classify(p.route);
      cards.push({
        route: c.label,
        routeName: c.line,
        stop,
        direction: "Live",
        next: etas[0] === 0 ? "Due" : `${etas[0]} min`,
        then: etas.slice(1, 3).map((m) => `${m} min`).join(", ") || "—",
        updated: "just now",
        status: "On time",
        color: c.color,
      });
    }
    cards.sort((a, b) => (a.next === "Due" ? 0 : parseInt(a.next)) - (b.next === "Due" ? 0 : parseInt(b.next)));
    return cards.slice(0, 8);
  });
}

// Live path for a single trip: finds the trip in the trip-updates feed and turns
// its stopTimeUpdates into an ordered list of map coordinates + predicted times.
// This is what lets the map draw a selected vehicle's route and animate it gliding
// stop-to-stop in real time. Returns null when the trip has no placeable path.
export async function getTripDetail(tripId: string): Promise<TripDetail | null> {
  if (!tripId) return null;
  return cached(`trip:${tripId}`, async () => {
    const entities = await fetchFeed(envUrl("TTC_GTFS_RT_TRIPS"));
    const match = entities.find((e) => (e.tripUpdate?.trip?.tripId ?? "") === tripId);
    const tu = match?.tripUpdate;
    if (!tu) return null;

    const routeId = tu.trip?.routeId ?? "";
    const c = classify(routeId);
    const nowSec = Date.now() / 1000;

    // GTFS-RT requires stop_time_updates to be ordered by stop_sequence, so we
    // keep the feed's order rather than re-sorting (a sort keyed on a fallback
    // index when stop_sequence is absent would corrupt an otherwise-correct order).
    const stops: TripStop[] = [];
    for (const stu of tu.stopTimeUpdate ?? []) {
      const rec = stopById(stu.stopId);
      if (!rec) continue; // can't place this stop on the map — skip it
      const t = stu.arrival?.time ?? stu.departure?.time;
      const time = t == null ? 0 : Number(t);
      const etaMin = Math.round((time - nowSec) / 60);
      stops.push({
        seq: stu.stopSequence == null ? stops.length : Number(stu.stopSequence),
        stopId: stu.stopId ?? "",
        name: rec.name,
        lat: rec.lat,
        lng: rec.lon,
        time,
        eta: time === 0 ? "—" : etaMin <= 0 ? "Due" : `${etaMin} min`,
        passed: time !== 0 && time < nowSec,
      });
    }

    if (stops.length < 2) return null; // need at least a segment to draw/animate

    return {
      tripId,
      route: c.label,
      routeName: c.line,
      type: c.type,
      color: c.color,
      tc: c.tc,
      dest: stops[stops.length - 1].name,
      stops,
      degraded: false,
      updated: new Date().toISOString(),
    };
  });
}
