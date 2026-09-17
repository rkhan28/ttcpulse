import { NextResponse } from "next/server";
import { ALERTS, type AlertsResponse } from "@/lib/data";
import { getAlerts } from "@/lib/gtfs";

export const dynamic = "force-dynamic";

// Live service alerts scraped from the official ttc.ca feed (route disruptions,
// elevator/escalator, and planned service changes). `?fresh=1` forces a re-scrape
// so a manual Refresh always pulls the latest straight from TTC.
export async function GET(req: Request) {
  const fresh = new URL(req.url).searchParams.get("fresh") === "1";
  try {
    const alerts = await getAlerts(fresh);
    const body: AlertsResponse = {
      alerts: alerts.length ? alerts : ALERTS,
      degraded: alerts.length === 0,
      updated: new Date().toISOString(),
    };
    return NextResponse.json(body);
  } catch (err) {
    console.error("/api/alerts failed, serving mock:");
    const body: AlertsResponse = { alerts: ALERTS, degraded: true, updated: new Date().toISOString() };
    return NextResponse.json(body);
  }
}
