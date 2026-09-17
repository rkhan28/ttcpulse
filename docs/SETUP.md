# Setup and API credentials

The map, stop search and service alerts do not need a paid API key. Ask Pulse uses OpenAI and requires a shared Upstash Redis budget before it will send a model request.

## 1. Run the app

Use Node.js 22 or later.

```bash
npm ci
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`. The template already includes the public TTC feed URLs. Feed availability is separate from application availability: fallback previews are not evidence that a feed is live.

## 2. Create an OpenAI key

1. Sign in to the [OpenAI API platform](https://platform.openai.com/).
2. Create or select a project dedicated to TTC Pulse.
3. Open the project's [API keys page](https://platform.openai.com/api-keys) and create a secret key. Copy it when it is shown; the full value cannot be retrieved later.
4. Configure API billing and usage alerts in that project. A ChatGPT subscription does not include API usage. Project budget alerts should not be treated as a hard spending cutoff.
5. Add the key to `OPENAI_API_KEY` in your local environment or Vercel project settings. Restrict its permissions to the API operations the app needs; the current implementation calls Chat Completions with streaming and tools.

The default model is `gpt-4o`. If it is unavailable to your project, choose a compatible model with `OPENAI_MODEL` and verify streaming and tool calls before publishing. Do not place a real key in the example file, browser code, screenshots or an issue.

References: [finding and managing API keys](https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key), [ChatGPT and API billing](https://help.openai.com/en/articles/9039756), [production practices](https://developers.openai.com/api/docs/guides/production-best-practices).

## 3. Create the shared usage budget

1. Open the [Upstash console](https://console.upstash.com/) and create a Redis database. Review the plan and region before creating it.
2. In the database connection details, copy its HTTPS REST URL into `UPSTASH_REDIS_REST_URL`.
3. Copy its regular read/write REST token into `UPSTASH_REDIS_REST_TOKEN`. The read-only token cannot update counters.
4. Use a dedicated database for production. Separate preview/development credentials keep tests from consuming production's allowance. Keep counter eviction disabled so memory pressure cannot silently reset usage controls.

The app reserves capacity atomically before contacting OpenAI. It admits at most **10 requests per clock minute and 100 per UTC day**, shared by every instance using that database. These are fixed windows, not rolling windows; bursts can occur on either side of a boundary. Failed model requests still consume a reservation. Redis stores counters with expiry, not messages, coordinates or client IP addresses.

If credentials are missing, Redis is unavailable, or its response is invalid, Ask Pulse returns an unavailable message without making a paid model request. This also applies during local development. No OpenAI key means the existing assistant-unavailable state; other pages remain usable.

Reference: [Upstash REST credentials and commands](https://upstash.com/docs/redis/features/restapi).

## 4. Configure Vercel

Import this repository as a Next.js project. Use `npm run build` and leave the output directory at its framework default. The checked-in static data means deployment does not need to download GTFS archives.

Under **Project → Settings → Environment Variables**, add:

| Variable | Value | Secret? |
| --- | --- | --- |
| `TTC_GTFS_RT_VEHICLES` | `https://bustime.ttc.ca/gtfsrt/vehicles` | No |
| `TTC_GTFS_RT_TRIPS` | `https://bustime.ttc.ca/gtfsrt/trips` | No |
| `TTC_GTFS_RT_ALERTS` | `https://bustime.ttc.ca/gtfsrt/alerts` | No |
| `OPENAI_API_KEY` | Your project's OpenAI API key | Yes |
| `UPSTASH_REDIS_REST_URL` | Your Redis database's HTTPS REST URL | Configuration |
| `UPSTASH_REDIS_REST_TOKEN` | Its read/write REST token | Yes |
| `OPENAI_MODEL` | Optional compatible model override | No |

Select Production for the live site. Use separate credentials if enabling Preview or Development. Mark secret values sensitive where supported. Redeploy after changing environment variables; existing deployments do not automatically receive changes.

No Vercel API token, Google Maps key, Mapbox key or TTC API key is required by this application's code. Vercel may separately require account authorization to manage deployments.

A Vercel sign-in page means deployment protection is active; it does not prove the application is broken. Review the production domain and Deployment Protection settings before sharing a recruiter-facing link. Keep paid assistant access protected until the budget and billing configuration have been verified.

Reference: [Vercel environment variables](https://vercel.com/docs/environment-variables).

## 5. Verify the deployment

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run start
```

The GitHub workflow also checks the actual Redis script against a Redis service, including concurrent reservations. That test is skipped locally unless `REDIS_CONTAINER` names a running Docker Redis container.

Check the deployed map, alerts, browser location permission and a named-stop query in Ask Pulse. Inspect degraded-data status rather than assuming displayed vehicles are live. A live assistant check consumes your API allowance. Verify the deployed domain in a signed-out browser before putting it on GitHub or your resume.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Assistant unavailable immediately | Is `OPENAI_API_KEY` present in this deployment? |
| Assistant temporarily unavailable | Redis URL/token, write permissions and database availability |
| Usage limit message | Shared minute or UTC-day allowance has been consumed |
| Error after the assistant starts | OpenAI billing/model access or upstream availability; errors are intentionally generic |
| Map shows degraded/sample data | Feed URLs, upstream availability and the API's `degraded` flag |
| Keys work locally but not on Vercel | Environment scope and whether a new deployment was built |

See [the security notes](../SECURITY.md) for the remaining limitations and incident response.
