// Mock TTC data + response logic for the TTC Pulse prototype.
// Structured so real GTFS-RT / API data can plug in later.

export type Mode = "subway" | "bus" | "streetcar";

export interface BoardSeed {
  id: string;
  badge: string;
  color: string;
  mode: string;
  dest: string;
  dir: string;
  base: number; // seconds to reset to
  secs: number; // current seconds remaining
}

export interface Vehicle {
  id: string;
  type: Mode;
  label: string;
  color: string;
  tc: string; // text color
  lat: number; // geographic position
  lng: number;
  bearing?: number; // heading in degrees (0 = north)
  line: string;
  dest: string;
  next: string;
  eta: string;
  upd: string;
  status: string;
  routeId?: string; // GTFS route_id (for joining to static data)
  tripId?: string; // GTFS-RT trip_id — resolves the live path via /api/trip
  seq?: number; // currentStopSequence along the trip
  speed?: number; // metres/second, when the feed reports it
  occupancy?: string; // e.g. "EMPTY", "MANY_SEATS_AVAILABLE"
}

// One upcoming stop on a live trip, used to draw the path and animate the
// vehicle gliding forward between stops in real time ("future buses moving").
export interface TripStop {
  seq: number;
  stopId: string;
  name: string;
  lat: number;
  lng: number;
  time: number; // predicted unix seconds at this stop
  eta: string; // "Due" / "3 min"
  passed: boolean; // already behind the vehicle's current sequence
}

// Full live detail for a single trip: route metadata + the ordered stop path.
export interface TripDetail {
  tripId: string;
  route: string; // short label, e.g. "504"
  routeName: string; // long name / line
  type: Mode;
  color: string;
  tc: string;
  dest: string; // final stop / headsign
  stops: TripStop[];
  degraded: boolean;
  updated: string;
}

export interface AlertItem {
  id: string;
  sev: "major" | "minor" | "info";
  mode: Mode;
  color: string;
  title: string;
  routes: string;
  desc: string;
  updated: string;
  url?: string; // link to the official TTC advisory, when available
  kind?: "alert" | "accessibility" | "service-change"; // source category on ttc.ca
}

export interface SavedRoute {
  id: string;
  badge: string;
  mode: string;
  color: string;
  name: string;
  from: string;
  to: string;
  time: string;
  next: string;
  status: string;
  risk: "Low" | "Medium" | "High";
  tip: string;
}

export interface ArrivalCard {
  route: string;
  routeName: string;
  stop: string;
  direction: string;
  next: string;
  then: string;
  updated: string;
  status: string;
  color: string;
}

export interface ChatMsg {
  role: "user" | "assistant";
  text: string;
  card?: ArrivalCard; // legacy single card
  cards?: ArrivalCard[]; // one card per route/vehicle the answer is about
}

// API response envelopes. `degraded` is true when live decoding failed and the
// payload is the mock fallback, so the UI can surface its error/empty states.
export interface VehiclesResponse {
  vehicles: Vehicle[];
  degraded: boolean;
  updated: string;
}

export interface AlertsResponse {
  alerts: AlertItem[];
  degraded: boolean;
  updated: string;
}

export interface ArrivalsResponse {
  stop: string;
  arrivals: ArrivalCard[];
  degraded: boolean;
  updated: string;
}

export interface TripResponse {
  trip: TripDetail | null;
  degraded: boolean;
  updated: string;
}

export const BOARD_SEED: BoardSeed[] = [
  { id: "939", badge: "939", color: "#D71920", mode: "Bus", dest: "Finch West", dir: "Eastbound", base: 240, secs: 138 },
  { id: "1", badge: "1", color: "#F7C400", mode: "Subway", dest: "Vaughan", dir: "Southbound", base: 150, secs: 92 },
  { id: "504", badge: "504", color: "#2563EB", mode: "Streetcar", dest: "Dundas West", dir: "Westbound", base: 360, secs: 201 },
  { id: "2", badge: "2", color: "#00923F", mode: "Subway", dest: "Kennedy", dir: "Eastbound", base: 300, secs: 264 },
];

export const VEHICLES: Vehicle[] = [
  { id: "s1", type: "subway", label: "1", color: "#F7C400", tc: "#1F2937", lat: 43.6710, lng: -79.3857, bearing: 0, line: "Line 1 Yonge–University", dest: "Finch", next: "Eglinton", eta: "2 min", upd: "8s", status: "On time" },
  { id: "s2", type: "subway", label: "2", color: "#00923F", tc: "#fff", lat: 43.6767, lng: -79.3585, bearing: 90, line: "Line 2 Bloor–Danforth", dest: "Kennedy", next: "Broadview", eta: "4 min", upd: "11s", status: "On time" },
  { id: "b939", type: "bus", label: "939", color: "#D71920", tc: "#fff", lat: 43.7065, lng: -79.4100, bearing: 80, line: "939 Finch Express", dest: "Finch West Stn", next: "Finch & Weston", eta: "4 min", upd: "20s", status: "On time" },
  { id: "b36", type: "bus", label: "36", color: "#D71920", tc: "#fff", lat: 43.6960, lng: -79.4520, bearing: 270, line: "36 Finch West", dest: "Finch Stn", next: "Finch & Dufferin", eta: "7 min", upd: "15s", status: "Slight delay" },
  { id: "t504", type: "streetcar", label: "504", color: "#2563EB", tc: "#fff", lat: 43.6440, lng: -79.4020, bearing: 270, line: "504 King", dest: "Dundas West", next: "King & Bathurst", eta: "3 min", upd: "9s", status: "On time" },
  { id: "t501", type: "streetcar", label: "501", color: "#2563EB", tc: "#fff", lat: 43.6492, lng: -79.3970, bearing: 90, line: "501 Queen", dest: "Long Branch", next: "Queen & Spadina", eta: "6 min", upd: "13s", status: "On time" },
];

// Mock arrivals fallback for /api/arrivals when the trip-update feed is down.
export const MOCK_ARRIVALS: ArrivalCard[] = [
  { route: "939", routeName: "Finch Express", stop: "Finch West Station", direction: "Eastbound", next: "4 min", then: "11 min, 18 min", updated: "20s ago", status: "On time", color: "#D71920" },
  { route: "1", routeName: "Line 1 Yonge–University", stop: "Finch West Station", direction: "Southbound", next: "2 min", then: "5 min, 9 min", updated: "8s ago", status: "On time", color: "#F7C400" },
  { route: "36", routeName: "Finch West", stop: "Finch West Station", direction: "Westbound", next: "7 min", then: "14 min, 22 min", updated: "15s ago", status: "Slight delay", color: "#D71920" },
];

export const ALERTS: AlertItem[] = [
  { id: "a1", sev: "major", mode: "subway", color: "#DC2626", title: "Line 2 — Minor delays", routes: "Line 2", desc: "Signal work between Broadview and Castle Frank is causing 5–8 min delays both ways.", updated: "4 min ago" },
  { id: "a2", sev: "minor", mode: "streetcar", color: "#F59E0B", title: "504 King — Short turning", routes: "504 King", desc: "Some 504 cars short-turning at Church due to congestion near Spadina.", updated: "12 min ago" },
  { id: "a3", sev: "info", mode: "bus", color: "#2563EB", title: "36 Finch West — Detour", routes: "36 Finch West", desc: "Detour via Sentinel Rd around watermain repair. Allow a few extra minutes.", updated: "31 min ago" },
];

export const SAVED_ROUTES: SavedRoute[] = [
  { id: "r1", badge: "939", mode: "Bus", color: "#D71920", name: "Finch West → Union", from: "Finch West Station", to: "Union Station", time: "38 min", next: "4 min", status: "On time", risk: "Low", tip: "Leave in ~6 min to catch the 7:42 train at Union." },
  { id: "r2", badge: "504", mode: "Streetcar", color: "#2563EB", name: "King → Distillery", from: "King & Bathurst", to: "Distillery District", time: "22 min", next: "3 min", status: "On time", risk: "Low", tip: "504 is running well right now — no need to rush." },
  { id: "r3", badge: "1", mode: "Subway", color: "#F7C400", name: "Eglinton → St George", from: "Eglinton", to: "St George", time: "14 min", next: "2 min", status: "Minor delay", risk: "Medium", tip: "Allow a couple extra minutes near Bloor today." },
];

export const PROMPTS = [
  "When's my next ride?",
  "Any delays right now?",
  "What's nearby?",
  "Plan a trip",
  "How's my commute?",
];

export const DEMO_MSGS: { role: "user" | "bot"; text: string }[] = [
  { role: "user", text: "When's the next 939 home?" },
  { role: "bot", text: "The 939 Finch Express arrives in 4 min, then 11 and 18." },
  { role: "user", text: "Is Line 1 delayed?" },
  { role: "bot", text: "Line 1 is running normally — no major delays right now." },
  { role: "user", text: "Streetcars near King & Bathurst?" },
  { role: "bot", text: "The 504 King is 3 min away, westbound." },
  { role: "user", text: "How's my commute home tonight?" },
  { role: "bot", text: "About 38 min — normal for now. Leave in 6 to be safe." },
  { role: "user", text: "Any alerts near Finch West?" },
  { role: "bot", text: "One: Line 2 has minor delays near Broadview." },
];

export const FAQ = [
  { q: "Can I see TTC vehicles live?", a: "Yes. TTC Pulse is designed to show live buses, streetcars, and trains wherever real-time data is available." },
  { q: "Can I ask when my bus is coming?", a: "Yes. Ask Pulse uses route, stop, and arrival data to answer natural commute questions." },
  { q: "Do I need to know stop IDs?", a: "No. The app asks for normal stop or station names, never numeric GTFS stop IDs." },
  { q: "Does it show service alerts?", a: "Yes. TTC Pulse includes alerts and disruptions so you can understand what is affecting your route." },
  { q: "Can I save my usual commute?", a: "Yes. Saved routes help Pulse monitor your regular trips and surface useful updates." },
  { q: "Is this only a map?", a: "No. It combines a live map, arrival predictions, alerts, saved routes, and an AI assistant." },
];

// Helpers derived from board seed
export interface BoardView extends BoardSeed {
  mins: string;
  unit: string;
  prog: string;
  tcol: string;
}

export function computeBoard(boards: BoardSeed[]): BoardView[] {
  return boards.map((b) => {
    const due = b.secs <= 30;
    return {
      ...b,
      mins: due ? "Due" : String(Math.ceil(b.secs / 60)),
      unit: due ? "now" : "min",
      prog: Math.min(100, (b.secs / b.base) * 100) + "%",
      tcol: b.color === "#F7C400" ? "#1F2937" : "#fff",
    };
  });
}
