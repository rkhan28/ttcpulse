// Server-only access to the embedded TTC GTFS *static* data (stops + routes).
// Run `npm run build:gtfs` to replace the seed files with the full feed.
import "server-only";
import stopsJson from "@/data/ttc-stops.json";
import routesJson from "@/data/ttc-routes.json";

export interface StopRecord {
  id: string;
  code?: string;
  name: string;
  lat: number;
  lon: number;
  mode?: string;
}

interface RouteRec {
  short?: string;
  long?: string;
  type?: number; // GTFS route_type: 0 tram/streetcar, 1 subway, 3 bus
  color?: string;
}

const STOPS = stopsJson as StopRecord[];
const ROUTES = routesJson as Record<string, RouteRec>;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

// Fast lookup of a physical stop by its GTFS stop_id. The bustime realtime feed
// references stops by stop_id (verified: 100% of trip-feed stop IDs resolve via
// stop_id, only ~59% via stop_code), so we deliberately index by id ONLY —
// indexing stop_code into the same map would let a realtime stop_id that happens
// to equal some other stop's code resolve to the wrong (km-away) coordinate.
const STOP_INDEX = new Map<string, StopRecord>();
for (const s of STOPS) STOP_INDEX.set(s.id, s);

export function stopById(id: string | null | undefined): StopRecord | undefined {
  if (!id) return undefined;
  return STOP_INDEX.get(id);
}

export interface StopGroup {
  name: string;
  lat: number;
  lon: number;
  mode?: string;
  ids: string[];
}

// Group physical stops (multiple platforms) by display name.
const groups = new Map<string, StopGroup>();
for (const s of STOPS) {
  const key = norm(s.name);
  let g = groups.get(key);
  if (!g) {
    g = { name: s.name, lat: s.lat, lon: s.lon, mode: s.mode, ids: [] };
    groups.set(key, g);
  }
  g.ids.push(s.id);
}
const GROUPS = [...groups.values()];

/** True once the full feed is embedded (seed file is tiny). */
export function hasFullStops(): boolean {
  return STOPS.length > 200;
}

/** Fuzzy stop search by name, ranked exact → prefix → substring. */
export function searchStops(q: string, limit = 8): StopGroup[] {
  const n = norm(q);
  if (n.length < 2) return [];
  const scored: { g: StopGroup; score: number }[] = [];
  for (const g of GROUPS) {
    const name = norm(g.name);
    let score = -1;
    if (name === n) score = 0;
    else if (name.startsWith(n)) score = 1;
    else if (name.includes(n)) score = 2;
    if (score >= 0) scored.push({ g, score });
  }
  scored.sort((a, b) => a.score - b.score || a.g.name.length - b.g.name.length);
  return scored.slice(0, limit).map((s) => s.g);
}

// Connector words dropped when matching intersection-style queries so that
// "Dufferin and Bloor" matches the stop "Dufferin St at Bloor St West".
const CONNECT = new Set(["and", "at"]);
function significantTokens(n: string): string[] {
  return n
    .replace(/[&/,]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !CONNECT.has(w));
}

/** All physical stop IDs that share a human stop/station name. */
export function resolveStopIds(name: string): string[] {
  const n = norm(name);
  const exact = groups.get(n);
  if (exact) return exact.ids;

  const ids: string[] = [];
  for (const g of GROUPS) {
    const gn = norm(g.name);
    if (gn.includes(n) || n.includes(gn)) {
      ids.push(...g.ids);
      if (ids.length > 40) break;
    }
  }
  if (ids.length) return ids;

  // Intersection fallback: every significant query token must appear in the
  // stop name (e.g. "Dufferin and Bloor" -> "Dufferin St at Bloor St West").
  const toks = significantTokens(n);
  if (toks.length >= 2) {
    for (const g of GROUPS) {
      const gn = norm(g.name);
      if (toks.every((t) => gn.includes(t))) {
        ids.push(...g.ids);
        if (ids.length > 40) break;
      }
    }
  }
  return ids;
}

/**
 * Resolve a human place/intersection to a single stop coordinate. Used to ground
 * "what's near X" queries. Falls back to intersection-token matching so informal
 * phrasings ("King and Bathurst") still land on a real stop.
 */
export function geocodePlace(q: string): StopGroup | undefined {
  const direct = searchStops(q, 1)[0];
  if (direct) return direct;
  const toks = significantTokens(norm(q));
  if (!toks.length) return undefined;
  let best: StopGroup | undefined;
  let bestLen = Infinity;
  for (const g of GROUPS) {
    const gn = norm(g.name);
    if (toks.every((t) => gn.includes(t)) && gn.length < bestLen) {
      best = g;
      bestLen = gn.length;
    }
  }
  return best;
}

/** Nearest stop group to a coordinate — reverse-geocodes a user's GPS fix so the
 *  assistant can answer "near me" without asking for an intersection. */
export function nearestStopGroup(lat: number, lng: number): StopGroup | undefined {
  const kx = Math.cos((lat * Math.PI) / 180);
  let best: StopGroup | undefined;
  let bestD = Infinity;
  for (const g of GROUPS) {
    const dLat = g.lat - lat;
    const dLng = (g.lon - lng) * kx;
    const d = dLat * dLat + dLng * dLng;
    if (d < bestD) {
      bestD = d;
      best = g;
    }
  }
  return best;
}

export function routeInfo(routeId: string): RouteRec | undefined {
  return ROUTES[routeId];
}

export function routeMode(routeId: string): "subway" | "streetcar" | "bus" | undefined {
  switch (ROUTES[routeId]?.type) {
    case 1: return "subway";
    case 0: return "streetcar";
    case 3: return "bus";
    default: return undefined;
  }
}
