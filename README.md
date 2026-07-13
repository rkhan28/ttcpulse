# TTC Pulse

A live, real-time Toronto transit companion — a premium dark web app that tracks
TTC buses, streetcars, and subways on a map, answers commute questions with an
AI assistant grounded in live data, and mirrors the official TTC service alerts.

Built with Next.js (App Router), TypeScript, and Tailwind CSS.

## Features

- **Live Map** (`/map`) — a full-viewport dark map. It starts empty; the **Nearby**
  panel lists real vehicles closest to you, and tapping one reveals that vehicle
  and animates it gliding along its live predicted path (upcoming stops + ETAs).
  Motion is interpolated between real GPS fixes with exponential smoothing, and
  vehicles without stop predictions dead-reckon from their reported heading/speed.
- **Ask Pulse** (`/ask`) — a streaming chat assistant grounded in the live feeds
  via tool calls. It uses your location automatically for "near me" questions,
  filters to a single route when you ask about one, and renders structured arrival
  cards. It never invents times and never asks for numeric stop IDs.
- **Alerts** (`/alerts`) — live service alerts scraped from the **official TTC feed**
  (route disruptions, elevator/escalator status, and planned service changes), so
  the list matches ttc.ca. Refresh re-scrapes on demand; each planned change links
  to its official advisory page.
- **Routes** (`/routes`) — saved-commute cards with route strips, ETAs, and tips.
- **Home** (`/`) — animated transit-network hero, live ticking arrival boards,
  feature cards, data grid, and FAQ.

## Data sources

| Data | Source |
| --- | --- |
| Vehicle positions | TTC GTFS-Realtime vehicles feed (surface routes) |
| Arrivals / trip paths | TTC GTFS-Realtime trip-updates feed |
| Service alerts + changes | Official ttc.ca alerts API (matches the TTC website) |
| Stops & routes (names, colours) | TTC GTFS static feed, embedded via `npm run build:gtfs` |
| Ask Pulse assistant | OpenAI chat model with tools grounded in the feeds above |

The realtime data layer lives in [`src/lib/gtfs.ts`](src/lib/gtfs.ts) and
[`src/lib/ttc-alerts.ts`](src/lib/ttc-alerts.ts); it decodes the GTFS-RT protobuf,
caches responses briefly, retries transient failures, and falls back to the last
known-good data (then to a small mock set) so the UI never blanks during an outage.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in the values
npm run build:gtfs                 # download + embed the TTC static feed (stops/routes)
npm run dev                        # http://localhost:3000
```

### Environment variables (`.env.local`)

```bash
# TTC GTFS-Realtime feeds (surface routes)
TTC_GTFS_RT_VEHICLES=https://bustime.ttc.ca/gtfsrt/vehicles
TTC_GTFS_RT_TRIPS=https://bustime.ttc.ca/gtfsrt/trips
TTC_GTFS_RT_ALERTS=https://bustime.ttc.ca/gtfsrt/alerts

# Ask Pulse (server-side only — never exposed to the browser)
OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o        # optional; any tool-calling chat model works
```

`.env.local` is gitignored and must never be committed.

## Scripts

```bash
npm run dev         # development server
npm run build       # production build
npm run start       # serve the production build
npm run lint        # eslint (next/core-web-vitals)
npm run build:gtfs  # download the TTC static feed → src/data/*.json
```

## Project structure

```
src/
  app/
    layout.tsx                 # fonts + persistent nav
    globals.css                # Tailwind + keyframes + scroll-driven reveals
    page.tsx                   # Home
    map/ routes/ alerts/ ask/  # page routes
    api/
      vehicles/  trip/         # live positions + trip paths
      arrivals/  stops/        # arrivals + stop search
      alerts/                  # official TTC alerts (with ?fresh re-scrape)
      ask/                     # streaming AI assistant (tool-grounded)
  components/
    Nav.tsx, TransitGlyph.tsx
    home/                      # Hero, FeatureCards, DataGrid, Faq, Footer, …
    map/                       # LiveMap + LeafletMap (animated tracking)
    alerts/AlertsCenter.tsx
    ask/AskPulse.tsx
  lib/
    gtfs.ts                    # GTFS-RT data layer (vehicles / arrivals / trips)
    gtfs-static.ts             # embedded stops + routes, stop search / geocode
    ttc-alerts.ts              # official ttc.ca alerts scraper
    data.ts                    # shared types + mock fallbacks
    hooks.ts                   # live-data React hooks
  data/                        # embedded GTFS static JSON (built via build:gtfs)
scripts/build-gtfs.mjs         # GTFS static → JSON
```

## Deployment

Deploys as a standard Next.js app (e.g. Vercel). Set the environment variables in
your host, run `npm run build:gtfs` as part of the build so the static stop/route
data is embedded, and configure `OPENAI_API_KEY` server-side.

Security headers (HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, a scoped `Permissions-Policy` for geolocation) are set in
[`next.config.mjs`](next.config.mjs).

## Notes

- The home scroll effects use CSS scroll-driven animations (`animation-timeline`);
  browsers without support fall back to fully-visible content, and reduced-motion
  is respected.
- The live TTC realtime feed occasionally has brief outages; the app serves the
  last known-good data during those, and clearly marks demo/fallback data in the UI.
