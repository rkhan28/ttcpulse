import { NextResponse } from "next/server";
import type { TripResponse } from "@/lib/data";
import { getTripDetail } from "@/lib/gtfs";

export const dynamic = "force-dynamic";

// Live path + upcoming stops for a single trip, used to draw the selected
// vehicle's route on the map and animate it gliding forward in real time.
// Returns { trip: null } (not an error) when the trip has no placeable path so
// the map can gracefully fall back to just the live vehicle point.
export async function GET(req: Request) {
  const tripId = new URL(req.url).searchParams.get("tripId")?.trim() || "";
  if (!tripId) {
    // Bad input (no tripId) — degraded:true distinguishes it from a valid trip
    // that simply has no placeable path (trip:null, degraded:false).
    return NextResponse.json<TripResponse>({ trip: null, degraded: true, updated: new Date().toISOString() });
  }
  try {
    const trip = await getTripDetail(tripId);
    return NextResponse.json<TripResponse>({ trip, degraded: trip === null, updated: new Date().toISOString() });
  } catch (err) {
    console.error("/api/trip failed:", err);
    return NextResponse.json<TripResponse>({ trip: null, degraded: true, updated: new Date().toISOString() });
  }
}
