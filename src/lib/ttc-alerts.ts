// Server-only scraper for the OFFICIAL TTC alerts feed — the exact JSON API that
// powers ttc.ca/service-alerts and ttc.ca/service-advisories/Service-Changes.
// One call returns live route disruptions, elevator/escalator (accessibility)
// alerts, and planned service changes, so our list matches the TTC site 1:1.
import "server-only";
import type { AlertItem, Mode } from "./data";

const OFFICIAL_URL = "https://www.ttc.ca/ttcapi/routedetail/getallroutesandstopsalerts";
const TTL_MS = 20_000;
const TIMEOUT_MS = 12_000;

let cache: { at: number; value: AlertItem[] } | null = null;

/** Decode the HTML entities the TTC feed embeds in titles (&#8211;, &amp;, …). */
function decode(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function modeFromType(routeType?: string): Mode {
  const t = (routeType || "").toLowerCase();
  if (t.includes("subway") || t.includes("elevator") || t.includes("escalator") || t === "rt") return "subway";
  if (t.includes("streetcar") || t.includes("tram")) return "streetcar";
  return "bus";
}

const SEV_COLOR: Record<AlertItem["sev"], string> = { major: "#DC2626", minor: "#F59E0B", info: "#2563EB" };

function agoLabel(iso?: string): string {
  if (!iso) return "now";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "now";
  const m = Math.round(Math.max(0, Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

function routeSeverity(effectDesc?: string, criticality?: number): AlertItem["sev"] {
  const e = (effectDesc || "").toLowerCase();
  if (/back in service|resumed|cleared|restored|no longer/.test(e)) return "info";
  if (/no service|suspend|closed|out of service|not running/.test(e)) return "major";
  if (/detour|bypass|divert|not stopping|reduced|short turn|delay|slow/.test(e)) return "minor";
  const c = criticality ?? 0;
  return c >= 0.75 ? "major" : c >= 0.4 ? "minor" : "info";
}

/** Split "509 Harbourfront: rest of the sentence" into [prefix, rest]. */
function splitHeader(header: string): [string, string] {
  const s = decode(header);
  const i = s.indexOf(":");
  if (i > 0 && i <= 48) return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
  return ["", s];
}

interface RawAlert {
  id?: string | number;
  route?: string;
  routeType?: string;
  effectDesc?: string;
  headerText?: string;
  title?: string;
  criticality?: number;
  activePeriod?: { start?: string };
}
interface RawChange {
  id?: string;
  title?: string;
  saTitle?: string;
  subTitle?: string;
  effectiveDateTitle?: string;
  route?: string;
  routeType?: string;
  url?: string;
  lastUpdated?: string;
}

/**
 * Fetch + normalize the official TTC alerts feed. Cached ~20s; pass force=true
 * (from a manual refresh) to re-scrape immediately.
 */
export async function getServiceAlerts(force = false): Promise<AlertItem[]> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.value;

  const res = await fetch(OFFICIAL_URL, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; TTC-Pulse)" },
  });
  if (!res.ok) throw new Error(`TTC alerts API returned ${res.status}`);
  const j = (await res.json()) as {
    routeAlerts?: RawAlert[];
    accessibilityAlerts?: RawAlert[];
    stopAlerts?: RawAlert[];
    serviceChanges?: RawChange[];
  };

  const out: AlertItem[] = [];
  const seen = new Set<string>();
  const push = (a: AlertItem) => {
    if (!a.desc && !a.title) return;
    const key = `${a.title}|${a.desc}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(a);
  };

  // Live route disruptions. The routeAlerts array also carries elevator/escalator
  // items — classify those as accessibility (minor) rather than major service loss.
  const isAccessType = (rt?: string) => /elevator|escalator/i.test(rt || "");
  for (const a of j.routeAlerts ?? []) {
    const [prefix, rest] = splitHeader(a.headerText || a.title || "");
    const effect = decode(a.effectDesc);
    const access = isAccessType(a.routeType);
    const sev = access ? "minor" : routeSeverity(a.effectDesc, a.criticality);
    push({
      id: `ra-${a.id}`,
      sev,
      mode: access ? "subway" : modeFromType(a.routeType),
      color: SEV_COLOR[sev],
      title: prefix ? `${prefix}${effect ? ` — ${access ? `${decode(a.routeType)} ${effect.toLowerCase()}` : effect}` : ""}` : effect || rest.slice(0, 64),
      routes: decode(a.route) || prefix || "TTC network",
      desc: rest || decode(a.headerText),
      updated: agoLabel(a.activePeriod?.start),
      kind: access ? "accessibility" : "alert",
    });
  }

  // Elevator / escalator (accessibility) — shown as their own kind on ttc.ca
  for (const a of j.accessibilityAlerts ?? []) {
    const [prefix, rest] = splitHeader(a.headerText || a.title || "");
    const kindLabel = decode(a.routeType) || "Elevator";
    const effect = decode(a.effectDesc) || "notice";
    push({
      id: `ac-${a.id}`,
      sev: "minor",
      mode: "subway",
      color: SEV_COLOR.minor,
      title: prefix ? `${prefix} — ${kindLabel} ${effect}`.trim() : `${kindLabel} ${effect}`,
      routes: prefix || decode(a.route) || "Accessibility",
      desc: rest || decode(a.headerText),
      updated: agoLabel(a.activePeriod?.start),
      kind: "accessibility",
    });
  }

  // Planned service changes / track work
  for (const c of j.serviceChanges ?? []) {
    const when = decode(c.effectiveDateTitle);
    const detail = decode(c.saTitle || c.subTitle || c.title);
    push({
      id: `sc-${c.id}`,
      sev: "info",
      mode: modeFromType(c.routeType),
      color: SEV_COLOR.info,
      title: decode(c.title) || `${decode(c.route)} — ${detail}`,
      routes: decode(c.route) || "Service change",
      desc: detail + (when ? ` — effective ${when}` : ""),
      updated: when || "planned",
      url: c.url || undefined,
      kind: "service-change",
    });
  }

  const rank = { major: 0, minor: 1, info: 2 } as const;
  out.sort((a, b) => rank[a.sev] - rank[b.sev]);

  cache = { at: Date.now(), value: out };
  return out;
}
