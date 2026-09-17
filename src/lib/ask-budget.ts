import "server-only";

// Atomic counters are shared across instances and deployments using this database.
// The limits cover the whole app; no message content or location is stored here.
export const RESERVE_SCRIPT = `
local minute = tonumber(redis.call('GET', KEYS[1]) or '0')
local day = tonumber(redis.call('GET', KEYS[2]) or '0')
if minute >= tonumber(ARGV[1]) then return 0 end
if day >= tonumber(ARGV[2]) then return 0 end
redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], 120)
redis.call('INCR', KEYS[2])
redis.call('EXPIRE', KEYS[2], 172800)
return 1
`;

export async function reserveAskBudget(now = Date.now()): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  // Development also uses the shared budget: attaching a key never bypasses it.
  if (!url || !token) throw new Error("Usage controls are not configured");
  const endpoint = new URL(url);
  if (endpoint.protocol !== "https:" || !endpoint.hostname.endsWith(".upstash.io") ||
      endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new Error("Invalid usage-control endpoint");
  }
  const res = await fetch(endpoint, {
    method: "POST", cache: "no-store", redirect: "error",
    signal: AbortSignal.timeout(3000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(["EVAL", RESERVE_SCRIPT, "2",
      `ttcpulse:ask:minute:${Math.floor(now / 60000)}`,
      `ttcpulse:ask:day:${Math.floor(now / 86400000)}`, "10", "100"]),
  });
  if (!res.ok) throw new Error("Usage controls are unavailable");
  const data = await res.json() as { result?: unknown; error?: unknown };
  if (data.error || (data.result !== 0 && data.result !== 1)) throw new Error("Invalid usage-control response");
  return data.result === 1;
}
