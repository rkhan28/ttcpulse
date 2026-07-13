import { NextResponse } from "next/server";
import { MOCK_ARRIVALS, type ArrivalsResponse } from "@/lib/data";
import { getArrivals } from "@/lib/gtfs";

export const dynamic = "force-dynamic";

// Trip-update based arrivals for a stop/station. On failure (or no live match)
// returns mock arrivals with degraded:true so the UI never blanks.
export async function GET(req: Request) {
  const stop = new URL(req.url).searchParams.get("stop")?.trim() || "";
  if (!stop) {
    const body: ArrivalsResponse = { stop: "", arrivals: MOCK_ARRIVALS, degraded: true, updated: new Date().toISOString() };
    return NextResponse.json(body);
  }
  try {
    const arrivals = await getArrivals(stop);
    const body: ArrivalsResponse = {
      stop,
      arrivals: arrivals.length ? arrivals : MOCK_ARRIVALS,
      degraded: arrivals.length === 0,
      updated: new Date().toISOString(),
    };
    return NextResponse.json(body);
  } catch (err) {
    console.error("/api/arrivals failed, serving mock:", err);
    const body: ArrivalsResponse = { stop, arrivals: MOCK_ARRIVALS, degraded: true, updated: new Date().toISOString() };
    return NextResponse.json(body);
  }
}
