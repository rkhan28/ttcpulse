import { NextResponse } from "next/server";
import { searchStops } from "@/lib/gtfs-static";

export const dynamic = "force-dynamic";

// Stop/station search backed by the embedded GTFS static feed.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length > 200) return NextResponse.json({ error: "Query is too long" }, { status: 400 });
  return NextResponse.json({ stops: searchStops(q, 8) });
}
