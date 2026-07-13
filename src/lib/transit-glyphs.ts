// Filled, two-tone transit pictograms ("logos") in a 24×24 box — a bus, a
// streetcar, and a subway/train front. `body` fills the silhouette; `win` fills
// the windows/headlights (pass the badge background so the windows read as
// cut-outs). Returned as raw SVG shape strings so the SAME glyph can render both
// in Leaflet div-icon markers (string HTML) and in React (see TransitGlyph).
import type { Mode } from "./data";

// These fills are rendered via innerHTML/dangerouslySetInnerHTML, so restrict
// them to a valid CSS color literal — never let arbitrary text reach the markup.
export function safeColor(c: string, fallback = "#6B7280"): string {
  return /^#[0-9a-fA-F]{3,8}$|^rgba?\([\d.,\s%]+\)$/.test((c ?? "").trim()) ? c.trim() : fallback;
}

export function transitShapes(mode: Mode, bodyColor: string, winColor: string): string {
  const body = safeColor(bodyColor);
  const win = safeColor(winColor, "#0A0A0A");
  switch (mode) {
    case "bus":
      return (
        `<rect x="3.6" y="3.4" width="16.8" height="13" rx="3.3" fill="${body}"/>` +
        `<rect x="5.7" y="5.6" width="12.6" height="4.6" rx="1.2" fill="${win}"/>` +
        `<rect x="4.6" y="12.4" width="2.4" height="2.2" rx="0.7" fill="${win}"/>` +
        `<rect x="17" y="12.4" width="2.4" height="2.2" rx="0.7" fill="${win}"/>` +
        `<circle cx="7.9" cy="18" r="1.95" fill="${body}"/>` +
        `<circle cx="16.1" cy="18" r="1.95" fill="${body}"/>`
      );
    case "streetcar":
      return (
        `<rect x="11.4" y="1.2" width="1.2" height="2.7" rx="0.6" fill="${body}"/>` +
        `<rect x="4.4" y="3.6" width="15.2" height="13.7" rx="3" fill="${body}"/>` +
        `<rect x="6.2" y="5.7" width="11.6" height="4.5" rx="1.1" fill="${win}"/>` +
        `<rect x="11.35" y="10.6" width="1.3" height="6.7" fill="${win}"/>` +
        `<circle cx="8.4" cy="18.7" r="1.7" fill="${body}"/>` +
        `<circle cx="15.6" cy="18.7" r="1.7" fill="${body}"/>`
      );
    default: // subway / train front
      return (
        `<path d="M12 2.3c-4.25 0-7 2.05-7 6.6v6.5a2.6 2.6 0 0 0 2.6 2.6h8.8a2.6 2.6 0 0 0 2.6-2.6V8.9c0-4.55-2.75-6.6-7-6.6Z" fill="${body}"/>` +
        `<rect x="7" y="6.3" width="10" height="4.4" rx="1.6" fill="${win}"/>` +
        `<circle cx="8.7" cy="13.8" r="1.15" fill="${win}"/>` +
        `<circle cx="15.3" cy="13.8" r="1.15" fill="${win}"/>`
      );
  }
}

/** Full standalone SVG string (for Leaflet div-icon marker HTML). */
export function transitSvg(mode: Mode, body: string, win: string, size: number): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 24 24" fill="none">${transitShapes(mode, body, win)}</svg>`
  );
}
