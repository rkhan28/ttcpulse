# Security

## Controls in the application

- OpenAI and Redis credentials remain in server-side environment variables. Environment files are ignored by Git except blank examples.
- Ask Pulse validates browser origin and JSON content type, reads at most 64 KiB within five seconds, and accepts only user/assistant chat roles and valid geographic coordinates.
- Model input uses at most the latest 12 messages, with a 4,000-character limit per message and 12,000 characters across those messages. Client-supplied system messages and extra fields cannot become privileged instructions.
- A Redis Lua script reserves capacity atomically across instances: 10 requests per clock minute and 100 per UTC day. Missing or failing usage controls block model requests. A reservation is not refunded after provider failure.
- Provider requests have a 20-second timeout, no automatic SDK retries and a 50-second application deadline. The assistant is limited to six model turns, each requesting at most 1,024 output tokens. Client cancellation aborts provider work.
- Redis requests require an HTTPS Upstash endpoint, do not follow redirects and time out after three seconds. The app never takes an upstream URL from chat input.
- Assistant responses are not cacheable. Public errors and application log messages omit raw provider errors and credentials.
- Transit search parameters are length-bounded. Feed caches have entry limits and expiration.
- Headers restrict framing, MIME sniffing, object embeds, base URLs and form destinations. Camera and microphone access are disabled; geolocation remains available to the app.

## Limits of these controls

The application has no user authentication or per-user allowance. Origin validation limits browser cross-site calls; it is not authentication and does not stop scripts outside a browser. Anyone who can reach the public endpoint can consume the shared allowance. Consider deployment protection or additional identity-based controls if public traffic exceeds a personal demo's needs.

The budget limits request counts, not dollars. A request can involve several model calls, and pricing depends on the configured model. Fixed windows can admit bursts across boundaries. Counter eviction, manual deletion or switching databases resets accounting; use a dedicated database with eviction disabled and monitor it. These controls do not cap Vercel bandwidth, function usage or all Redis costs.

The Content Security Policy deliberately covers only compatible directives; it is not a complete script/style policy or a guarantee against cross-site scripting. There are no tools for executing code, writing files or fetching arbitrary user-provided URLs. Model answers and transit feeds remain untrusted information, and prompt injection is not completely prevented by role validation.

## Data handling

Chat messages and the nearest stop derived from a permitted location can be sent to OpenAI to answer a question. Coordinates are used by the application server for nearby-stop and vehicle lookup. The application does not implement a chat database. Redis receives counter keys and numeric limits only. Map tile requests go to the configured tile provider. Hosting and service providers may retain their own request metadata under their policies.

Keep credentials out of public issues and logs. `.gitignore` does not remove files already tracked, and deleting a leaked secret from a file does not revoke it.

## Reporting and response

Report a vulnerability through GitHub's private vulnerability reporting option if enabled. If it is unavailable, ask the maintainer for a private contact without posting exploit details or credentials publicly.

For a suspected credential leak, revoke the credential at its provider, replace the server-side value and redeploy. Review provider usage and Vercel logs. Remove `OPENAI_API_KEY` from deployment configuration and redeploy to disable paid assistant access while investigating. History cleanup is a separate step and is not a substitute for revocation.
