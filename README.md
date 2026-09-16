# TTC Pulse

A Toronto transit web app built with Next.js, TypeScript, Leaflet, and GTFS-Realtime integrations.

## Current features

- `/map`: surface vehicle positions and nearby vehicles, subject to feed availability.
- `/alerts`: TTC service alerts.
- `/ask`: optional server-side AI assistant using transit tools.
- `/routes`: sample commute cards; saving and monitoring are not implemented.

TTC subway vehicle tracking is not provided by the surface feed. Location requires browser permission. Predictions can be stale or unavailable; this app does not guarantee arrival times or an optimal route.

## Run locally

```bash
npm ci
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`. An OpenAI key is optional; without it, Ask Pulse explains that it is unavailable. Keep `OPENAI_API_KEY` server-side. Do not use a `NEXT_PUBLIC_` prefix for secrets.

```bash
npm run typecheck
npm run lint
npm run build
npm run start
```

## Transit data

Feed URLs are configured in `.env.local.example`. The repository includes static route/stop JSON. Refresh it when needed with `npm run build:gtfs`; this command downloads external TTC data and needs network access.

The map/API layer can show fallback sample data when feeds fail. Inspect the `degraded` response flag and displayed status. The AI tools do not substitute fabricated vehicles or alerts for failed requests. Home-page previews and route cards include illustrative data.

## Deployment

Import into Vercel using the Next.js preset and `npm run build`. Existing static JSON avoids depending on a GTFS download during every deployment. Configure feed URLs if defaults need changing. Public AI access needs authentication or deployment-level access controls and a spending limit before adding a paid API key; this repository does not include a durable rate limiter.

## Structure

- `src/app/api/`: transit and assistant endpoints.
- `src/lib/gtfs.ts`: realtime feed handling and caching.
- `src/lib/ttc-alerts.ts`: alert extraction.
- `src/lib/gtfs-static.ts`: stop and route lookup.
- `src/components/map/`: map interface.
- `scripts/build-gtfs.mjs`: static data importer.

## Status

Personal project with live integrations and prototype areas. It is not affiliated with the TTC. External feed availability, deployed AI access controls, and end-to-end live-data behaviour need verification for each deployment.
