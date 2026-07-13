import OpenAI from "openai";
import { ALERTS, VEHICLES, type ArrivalCard, type ChatMsg } from "@/lib/data";
import { getAlerts, getArrivals, getVehicles, nearestVehicles } from "@/lib/gtfs";
import { geocodePlace, nearestStopGroup } from "@/lib/gtfs-static";

interface Loc { lat: number; lng: number; }
const NEAR_ME = /\b(near|around|by|close to)?\s*(me|my location|here|current location|nearby|where i am)\b/i;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const MAX_TOOL_TURNS = 6;

const SYSTEM = `You are Pulse, a warm, sharp Toronto TTC assistant. You have LIVE data through tools — always ground answers in them; never invent times, routes, or alerts. Talk like a helpful human: brief, natural, no corporate filler.

TOOLS
- get_arrivals(stopOrStation, route?, direction?) — upcoming arrivals at a stop/station. When the user asks about ONE specific route ("next 36", "when's the 504"), ALWAYS pass \`route\` so only that route is returned — never dump every route at the stop.
- get_nearby_vehicles(near?) — live vehicles near a place. Omit \`near\` to use the user's own location.
- get_alerts(route?) — official ttc.ca service alerts: live disruptions, elevator/escalator, and planned service changes.

LOCATION & MEMORY
- The user's GPS location is often provided with each message. Use it automatically for location-relative questions ("next ride", "what's nearby", "how's my commute") — never ask where they are when it's available. Never ask for numeric stop IDs.
- If the user STATES a place or stop ("I'm at Finch Station", "from King & Bathurst"), remember it and keep using it for every follow-up until they name a new one. A stated place overrides GPS.
- Answer ONLY about that location — don't drift to other stops, routes, or areas.

NO ASSUMPTIONS (important)
- Never assume a destination, a direction, or which route is "theirs". For "when's my next ride" / "what's coming", just show what's ARRIVING at their stop, phrased neutrally ("Here's what's arriving at <stop>:"). Do NOT say "your next ride is the 41" or guess where they're going.
- If answering needs a detail you don't have (a destination for a trip, a direction), ask ONE short question — never guess.

BREVITY & CARDS (important)
- get_arrivals and get_nearby_vehicles auto-render a VISUAL CARD per route/vehicle. Write ONE short intro line and let the cards carry the details. Do NOT re-list routes/times in prose and NEVER mention distances in km.
- Write that intro line ONCE, only after the tools return. Never narrate ("Let me check…") or repeat yourself. No filler openers/closers. 1–2 short sentences, lead with the answer.
- If a tool returned data, present it — never say you "couldn't fetch".

SPECIFIC ROUTE
- "When's the 36 at Finch West?" → get_arrivals(stopOrStation:"Finch West Station", route:"36"). Show only the 36. Same for any single-route question.

ALERTS
- One short sentence naming the few most relevant routes affected, then on its own line: "Full details: https://www.ttc.ca/service-alerts". If nothing relevant, say service looks normal in one line.

TRIP PLANNING ("X to Y")
- Only treat it as a trip when the user gives BOTH an origin and a destination. If they give only one place, don't invent the other — show arrivals there, or ask where they're headed.
- Give the FASTEST realistic route as a SHORT recommendation: which bus/streetcar/line and where to transfer. Do NOT default to the subway — a direct surface route is often faster. Do NOT dump all arrivals at the origin. You may check live arrivals for the FIRST leg's SPECIFIC route only (get_arrivals with that route). Keep it to 1–3 sentences; if geography is uncertain, give your best call briefly.

COVERAGE
- You have live/upcoming arrivals + live positions, not full timetables. For "first/last bus of the day", don't refuse — show the next live arrivals.
- Stay a Toronto transit companion; gently redirect off-topic questions.`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_arrivals",
      description: "Get upcoming TTC arrivals for a stop/station (never a numeric ID). Omit stopOrStation (or pass 'near me') to use the user's current location.",
      parameters: {
        type: "object",
        properties: {
          stopOrStation: { type: "string", description: "Human-friendly stop or station name, e.g. 'Finch West Station' or 'King & Bathurst'. Omit to use the user's location." },
          route: { type: "string", description: "Route/line number to show ONLY that route, e.g. '36' or '504'. Always set this for single-route questions." },
          direction: { type: "string", description: "Optional direction, e.g. 'Eastbound' or 'Southbound'." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_alerts",
      description: "Get current TTC service alerts and disruptions, optionally filtered to a route or line.",
      parameters: {
        type: "object",
        properties: {
          route: { type: "string", description: "Optional route or line to filter by, e.g. 'Line 2' or '504'." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_nearby_vehicles",
      description: "List live TTC vehicles (buses, streetcars, trains) near a place. Omit `near` to use the user's current location (preferred when they say 'near me' / don't name a place).",
      parameters: {
        type: "object",
        properties: {
          near: { type: "string", description: "Optional human-friendly location, e.g. 'King & Bathurst'. Omit to use the user's location." },
        },
      },
    },
  },
];

const modeName = (t: string) => (t === "subway" ? "Subway" : t === "streetcar" ? "Streetcar" : "Bus");

// Tool implementations reuse the GTFS data layer with the same mock fallback as
// the /api/* route handlers, so Pulse is grounded in real (or fallback) data.
// Tools return `cards` (one per route/vehicle) which the app renders as visual
// cards; the model's text should stay short and let the cards carry the details.
async function runTool(name: string, input: Record<string, unknown>, loc?: Loc): Promise<{ result: unknown; cards?: ArrivalCard[] }> {
  if (name === "get_arrivals") {
    let stop = String(input.stopOrStation ?? "").trim();
    // "near me" / empty stop → reverse-geocode the user's location to a real stop.
    if ((!stop || NEAR_ME.test(stop)) && loc) {
      const g = nearestStopGroup(loc.lat, loc.lng);
      if (g) stop = g.name;
    }
    if (!stop) stop = "your stop";
    let arrivals: ArrivalCard[] = [];
    try {
      arrivals = await getArrivals(stop);
    } catch {
      /* feed unavailable */
    }
    if (!arrivals.length) {
      return {
        result: {
          stop,
          arrivals: [],
          note: "No live arrivals found for that stop. It may be a subway station (TTC publishes no real-time subway feed) or the name didn't match a TTC stop. Ask the user to confirm the exact stop name or the nearest major intersection.",
        },
      };
    }
    let filtered = arrivals;
    if (input.route) filtered = filtered.filter((a) => a.route.toLowerCase() === String(input.route).toLowerCase());
    if (!filtered.length) filtered = arrivals;
    const cards = filtered.slice(0, 6).map((a) => ({ ...a, stop }));
    return { result: { stop, arrivals: filtered }, cards };
  }

  if (name === "get_alerts") {
    let alerts;
    try {
      const live = await getAlerts();
      alerts = live.length ? live : ALERTS;
    } catch {
      alerts = ALERTS;
    }
    if (input.route) {
      const q = String(input.route).toLowerCase();
      alerts = alerts.filter((a) => a.routes.toLowerCase().includes(q) || a.title.toLowerCase().includes(q));
    }
    // Cap to the top few (major first) and point to the official page.
    return { result: { alerts: alerts.slice(0, 5), total: alerts.length, officialUrl: "https://www.ttc.ca/service-alerts" } };
  }

  if (name === "get_nearby_vehicles") {
    let vehicles;
    try {
      const live = await getVehicles();
      vehicles = live.length ? live : VEHICLES;
    } catch {
      vehicles = VEHICLES;
    }
    const near = String(input.near ?? "").trim();
    // Geocode the place to a stop coordinate, then rank vehicles by real distance
    // so "what's near King & Bathurst" returns the actually-closest vehicles.
    // If the user means "near me" (or gave nothing) and we have their location,
    // reverse-geocode it instead of asking.
    let place = near && !NEAR_ME.test(near) ? geocodePlace(near) : undefined;
    if (!place && loc) place = nearestStopGroup(loc.lat, loc.lng);
    if (near && !NEAR_ME.test(near) && !place && !loc) {
      return {
        result: {
          near,
          vehicles: [],
          note: "Couldn't locate that place. Ask the user for a nearby major intersection or stop name (e.g. 'King & Bathurst').",
        },
      };
    }
    const ranked = place ? nearestVehicles(vehicles, { lat: place.lat, lng: place.lon }, 8) : vehicles.slice(0, 8);
    const where = place?.name ?? near ?? "Nearby";
    // Render each nearby vehicle as a card (no distances — the user asked for the
    // buses, not how far each one is).
    const cards: ArrivalCard[] = ranked.map((v) => ({
      route: v.label,
      routeName: v.line,
      stop: where,
      direction: modeName(v.type),
      next: "Live",
      then: "—",
      updated: "now",
      status: v.status,
      color: v.color,
    }));
    const list = ranked.map((v) => ({ route: v.label, mode: v.type, line: v.line, status: v.status }));
    return { result: { near, resolvedNear: place?.name ?? null, vehicles: list }, cards };
  }

  return { result: { error: `Unknown tool ${name}` } };
}

// Convert the client's chat history into OpenAI message params, dropping any
// leading assistant turns so the conversation reads naturally.
function toMessages(chat: ChatMsg[]): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const msgs: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  for (const m of chat) {
    if (!m.text?.trim()) continue;
    if (msgs.length === 0 && m.role !== "user") continue;
    msgs.push({ role: m.role, content: m.text });
  }
  return msgs;
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return streamError("Ask Pulse isn't configured yet. Add OPENAI_API_KEY to .env.local to enable the live assistant.");
  }

  let chat: ChatMsg[] = [];
  let loc: Loc | undefined;
  try {
    const body = await req.json();
    chat = Array.isArray(body?.messages) ? body.messages : [];
    const l = body?.location;
    if (l && Number.isFinite(l.lat) && Number.isFinite(l.lng) && Math.abs(l.lat) <= 90 && Math.abs(l.lng) <= 180) {
      loc = { lat: l.lat, lng: l.lng };
    }
  } catch {
    return streamError("Sorry, I couldn't read that message.");
  }

  const history = toMessages(chat);
  if (!history.length) return streamError("Ask me about a TTC route, stop, delay, or your commute.");

  // Ground "near me" queries: tell the model where the user is (as a stop name)
  // so it can answer without asking for an intersection.
  let locNote = "";
  if (loc) {
    const g = nearestStopGroup(loc.lat, loc.lng);
    locNote = g
      ? `\n\nThe user's current location is available (nearest stop: ${g.name}). For "near me" / "nearby" / "what's my next ride" questions, use it directly via the tools — do NOT ask them where they are.`
      : "";
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{ role: "system", content: SYSTEM + locNote }, ...history];

  const client = new OpenAI();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
          const completion = await client.chat.completions.create({
            model: MODEL,
            max_tokens: 1024,
            messages,
            tools: TOOLS,
            stream: true,
          });

          let content = "";
          // Accumulate streamed tool-call fragments keyed by their array index.
          const calls: Record<number, { id: string; name: string; args: string }> = {};

          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta;
            if (!delta) continue;
            if (delta.content) {
              content += delta.content;
              send({ type: "text", text: delta.content });
            }
            for (const tc of delta.tool_calls ?? []) {
              const slot = (calls[tc.index] ??= { id: "", name: "", args: "" });
              if (tc.id) slot.id = tc.id;
              if (tc.function?.name) slot.name += tc.function.name;
              if (tc.function?.arguments) slot.args += tc.function.arguments;
            }
          }

          const toolCalls = Object.values(calls);
          if (toolCalls.length === 0) break; // model produced a final text answer

          messages.push({
            role: "assistant",
            content: content || null,
            tool_calls: toolCalls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.args || "{}" } })),
          });

          for (const c of toolCalls) {
            let input: Record<string, unknown> = {};
            try {
              input = JSON.parse(c.args || "{}");
            } catch {
              /* leave empty on malformed args */
            }
            const { result, cards } = await runTool(c.name, input, loc);
            for (const card of cards ?? []) send({ type: "card", card });
            messages.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify(result) });
          }
        }
        send({ type: "done" });
      } catch (err) {
        console.error("/api/ask error:", err);
        send({ type: "error", message: "Pulse hit a problem reaching the assistant. Please try again." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// Minimal single-event NDJSON stream for early-exit cases.
function streamError(message: string): Response {
  const payload = JSON.stringify({ type: "error", message }) + "\n";
  return new Response(payload, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
