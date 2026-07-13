import { NextResponse } from "next/server";
import { VEHICLES, type VehiclesResponse } from "@/lib/data";
import { getVehicles, nearestVehicles } from "@/lib/gtfs";

export const dynamic = "force-dynamic";

const DOWNTOWN = { lat: 43.6532, lng: -79.3832 };
const DEFAULT_LIMIT = 300;
const MAX_LIMIT = 600;

function num(v: string | null): number | null {
  if (v == null) return null;
  const t = v.trim();
  if (t === "") return null; // Number("") === 0 — treat blank params as absent
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// Live vehicle positions, decoded from TTC GTFS-RT. Returns the `limit` vehicles
// nearest to (lat,lng) — or downtown when the caller doesn't send a location —
// so the Nearby panel is accurate wherever the user is. On any failure we return
// the mock vehicles with degraded:true so the UI shows its states instead of blanking.
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const lat = num(params.get("lat"));
  const lng = num(params.get("lng"));
  const validLatLng = lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
  const center = validLatLng ? { lat, lng } : DOWNTOWN;
  const limit = Math.min(MAX_LIMIT, Math.max(1, num(params.get("limit")) ?? DEFAULT_LIMIT));

  try {
    const all = await getVehicles();
    const vehicles = all.length ? nearestVehicles(all, center, limit) : VEHICLES;
    const body: VehiclesResponse = {
      vehicles,
      degraded: all.length === 0,
      updated: new Date().toISOString(),
    };
    return NextResponse.json(body);
  } catch (err) {
    console.error("/api/vehicles failed, serving mock:", err);
    const body: VehiclesResponse = { vehicles: VEHICLES, degraded: true, updated: new Date().toISOString() };
    return NextResponse.json(body);
  }
}
