# TTC Pulse

TTC Pulse brings Toronto vehicle positions, service alerts and stop predictions into one place, with an optional assistant for questions about a stop or route.

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

Open `http://localhost:3000`. The map and alerts do not need a paid API key. Ask Pulse requires an OpenAI key and Upstash Redis credentials for shared usage controls. Without an OpenAI key, it explains that it is unavailable. See the [setup guide](docs/SETUP.md) for exact credentials and deployment steps.

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run start
```

## Transit data

Feed URLs are configured in `.env.local.example`. The repository includes static route/stop JSON. Refresh it when needed with `npm run build:gtfs`; this command downloads external TTC data and needs network access.

The map/API layer can show fallback sample data when feeds fail. Inspect the `degraded` response flag and displayed status. The AI tools do not substitute fabricated vehicles or alerts for failed requests. Home-page previews and route cards include illustrative data.

## Deployment

Import into Vercel using the Next.js preset and `npm run build`. Existing static JSON avoids depending on a GTFS download during every deployment. Set the three public feed URLs from the environment template. For Ask Pulse, configure the server-only OpenAI and Redis credentials, then redeploy. Shared limits admit 10 assistant requests per clock minute and 100 per UTC day; unavailable usage controls block paid calls. These limits are app-wide, not per-user or a dollar cap. See [setup](docs/SETUP.md) and [security](SECURITY.md).

## Structure

- `src/app/api/`: transit and assistant endpoints.
- `src/lib/request-security.ts` and `ask-budget.ts`: input validation and shared usage limits.
- `src/lib/gtfs.ts`: realtime feed handling and caching.
- `src/lib/ttc-alerts.ts`: alert extraction.
- `src/lib/gtfs-static.ts`: stop and route lookup.
- `src/components/map/`: map interface.
- `scripts/build-gtfs.mjs`: static data importer.

## Status

Personal project with live integrations and prototype areas. It is not affiliated with the TTC. External feed availability, deployed AI access controls, and end-to-end live-data behaviour need verification for each deployment.
