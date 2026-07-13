#!/usr/bin/env node
// Downloads the TTC GTFS *static* feed and emits compact JSON the app embeds:
//   src/data/ttc-stops.json   — [{ id, code, name, lat, lon }]
//   src/data/ttc-routes.json  — { [route_id]: { short, long, type, color } }
//
// Run on a machine that can reach the TTC/Toronto open-data host:
//   npm run build:gtfs
// Override the source if the URL changes:
//   TTC_GTFS_STATIC_URL=https://… npm run build:gtfs
//
// Source: City of Toronto Open Data — "TTC GTFS-Realtime (GTFS-RT)" companion
// static feed "SurfaceGTFS.zip". IMPORTANT: this is the static feed whose
// stop_id / route_id namespace MATCHES the bustime.ttc.ca realtime feeds. The
// separate "TTC Routes and Schedules" schedule zip uses a DIFFERENT stop_id
// namespace and must NOT be used here — joining realtime stop IDs against it
// yields wrong coordinates (~12 km median error). Surface = buses + streetcars
// (no subway; TTC publishes no realtime subway feed).

import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_URL =
  "https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/bd4809dd-e289-4de8-bbde-c5c00dafbf4f/resource/28514055-d011-4ed7-8bb0-97961dfe2b66/download/SurfaceGTFS.zip";
const URL = process.env.TTC_GTFS_STATIC_URL || DEFAULT_URL;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "src", "data");

// Minimal RFC-4180 CSV parser (handles quotes + commas inside fields).
function parseCSV(text) {
  const rows = [];
  let field = "", row = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch !== "\r") field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function toRecords(text) {
  const rows = parseCSV(text.replace(/^﻿/, ""));
  const header = rows.shift().map((h) => h.trim());
  return rows
    .filter((r) => r.length > 1)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

async function main() {
  const tmp = mkdtempSync(join(tmpdir(), "ttc-gtfs-"));
  const zip = join(tmp, "gtfs.zip");
  console.log(`↓ downloading ${URL}`);
  execSync(`curl -fSL --retry 3 -o "${zip}" "${URL}"`, { stdio: "inherit" });
  console.log("↪ extracting stops.txt + routes.txt");
  execSync(`unzip -o "${zip}" stops.txt routes.txt -d "${tmp}"`, { stdio: "inherit" });

  const stops = toRecords(readFileSync(join(tmp, "stops.txt"), "utf8"))
    .filter((s) => s.stop_lat && s.stop_lon && s.stop_name)
    .map((s) => ({
      id: s.stop_id,
      code: s.stop_code || undefined,
      name: s.stop_name,
      lat: +(+s.stop_lat).toFixed(5),
      lon: +(+s.stop_lon).toFixed(5),
    }));

  const routes = {};
  for (const r of toRecords(readFileSync(join(tmp, "routes.txt"), "utf8"))) {
    routes[r.route_id] = {
      short: r.route_short_name || undefined,
      long: r.route_long_name || undefined,
      type: r.route_type ? Number(r.route_type) : undefined,
      color: r.route_color || undefined,
    };
  }

  writeFileSync(join(OUT_DIR, "ttc-stops.json"), JSON.stringify(stops));
  writeFileSync(join(OUT_DIR, "ttc-routes.json"), JSON.stringify(routes));
  rmSync(tmp, { recursive: true, force: true });

  console.log(`✓ wrote ${stops.length} stops and ${Object.keys(routes).length} routes to src/data/`);
}

main().catch((err) => {
  console.error("GTFS build failed:", err.message);
  process.exit(1);
});
