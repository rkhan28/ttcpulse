import "server-only";

export class RequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export function requireSameOriginJson(req: Request): void {
  const origin = req.headers.get("origin");
  // Next may use an internal hostname in req.url; Host carries the browser's
  // requested authority. Forwarded-host headers are deliberately not trusted.
  const expected = new URL(req.url);
  if (req.headers.get("host")) expected.host = req.headers.get("host")!;
  if (req.headers.get("sec-fetch-site") === "cross-site" ||
      (origin && origin !== expected.origin)) {
    throw new RequestError("This request is not allowed.", 403);
  }
  if (req.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    throw new RequestError("Send a JSON request.", 415);
  }
}

export async function readBoundedJson(req: Request, maxBytes = 65536): Promise<unknown> {
  const length = req.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes)) {
    throw new RequestError("That message is too large.", 413);
  }
  if (!req.body) throw new RequestError("A message is required.", 400);
  const reader = req.body.getReader();
  let timedOut = false;
  const deadline = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => {}); }, 5000);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RequestError("That message is too large.", 413);
      }
      chunks.push(value);
    }
  } finally { clearTimeout(deadline); reader.releaseLock(); }
  if (timedOut) throw new RequestError("The request took too long.", 408);
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new RequestError("Sorry, I couldn't read that message.", 400); }
}

export function parseChatPayload(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new RequestError("A message is required.", 400);
  const value = body as Record<string, unknown>;
  if (!Array.isArray(value.messages) || !value.messages.length || value.messages.length > 200) {
    throw new RequestError("A valid conversation is required.", 400);
  }
  const chat: { role: "user" | "assistant"; text: string }[] = [];
  let characters = 0;
  for (const item of value.messages.slice(-12)) {
    if (!item || typeof item !== "object" ||
        (item.role !== "user" && item.role !== "assistant") ||
        typeof item.text !== "string" || item.text.length > 4000) {
      throw new RequestError("That conversation could not be read.", 400);
    }
    characters += item.text.length;
    chat.push({ role: item.role, text: item.text });
  }
  if (characters > 12000) throw new RequestError("Please start a shorter conversation.", 413);
  if (chat.at(-1)?.role !== "user" || !chat.at(-1)?.text.trim()) throw new RequestError("A message is required.", 400);
  let location: { lat: number; lng: number } | undefined;
  const loc = value.location as { lat?: unknown; lng?: unknown } | null | undefined;
  if (loc != null) {
    if (typeof loc !== "object" || typeof loc.lat !== "number" || typeof loc.lng !== "number" ||
        !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng) || Math.abs(loc.lat) > 90 || Math.abs(loc.lng) > 180) {
      throw new RequestError("The location could not be read.", 400);
    }
    location = { lat: loc.lat, lng: loc.lng };
  }
  return { chat, location };
}
