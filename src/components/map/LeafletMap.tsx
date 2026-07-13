"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Vehicle, TripStop } from "@/lib/data";
import { transitSvg, safeColor } from "@/lib/transit-glyphs";

export const TORONTO: [number, number] = [43.6532, -79.3832];

// The vehicle marker is built as an HTML string for Leaflet's divIcon, so any
// value interpolated into it is escaped/validated first (defence-in-depth even
// though route labels/colours come from the trusted GTFS feed).
function esc(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapControls {
  recenter: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  panTo: (lat: number, lng: number) => void;
  fitTo: (points: [number, number][]) => void;
}

interface LeafletMapProps {
  selected: Vehicle | null; // the one tracked vehicle (map is empty otherwise)
  path: TripStop[] | null; // its live trip path (upcoming stops)
  showLabels: boolean;
  userPos: LatLng | null;
  stopPin: LatLng | null;
  onTilesLoad: () => void;
  controls: React.MutableRefObject<MapControls | null>;
}

/** rgba() from a #hex + alpha, for translucent glows/rings. */
function withAlpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Marker HTML for the tracked vehicle — a filled transit glyph + route badge. */
function markerHtml(v: Vehicle): string {
  const color = safeColor(v.color, "#D71920");
  const tc = safeColor(v.tc, "#ffffff");
  const svg = transitSvg(v.type, tc, color, v.type === "subway" ? 17 : 16);
  let badge =
    `position:relative;display:inline-flex;align-items:center;gap:5px;font-weight:700;` +
    `font-size:13.5px;line-height:1;color:${tc};background:${color};` +
    `border:2.5px solid #0A0A0A;box-shadow:0 6px 20px rgba(0,0,0,.6);` +
    `font-family:var(--font-geist-sans),system-ui,sans-serif;white-space:nowrap;` +
    `outline:3px solid rgba(255,255,255,.92);outline-offset:3px;`;
  if (v.type === "subway") badge += `height:38px;padding:0 14px;border-radius:999px;`;
  else if (v.type === "streetcar") badge += `height:34px;padding:0 14px;border-radius:999px;`;
  else badge += `height:34px;padding:0 12px;border-radius:11px;`;

  const ring =
    `<span style="position:absolute;left:50%;top:50%;width:48px;height:48px;border-radius:50%;` +
    `transform:translate(-50%,-50%);background:${withAlpha(color, 0.3)};` +
    `animation:pulseRing 2.4s ease-out infinite;pointer-events:none;"></span>`;

  return (
    `<div style="position:absolute;left:0;top:0;transform:translate(-50%,-50%);">` +
    ring +
    `<span style="${badge}">${svg}<span>${esc(v.label)}</span></span>` +
    `</div>`
  );
}

interface Waypoint {
  lat: number;
  lng: number;
  t: number; // unix seconds this point is reached
}

/**
 * Renders the single tracked vehicle: its live position, its upcoming route path,
 * upcoming-stop dots, and a requestAnimationFrame loop that glides the marker
 * forward along the predicted timeline in real time ("future buses moving").
 * Re-anchors to the real reported position on every data refresh.
 */
function SelectedVehicleLayer({ selected, path }: { selected: Vehicle | null; path: TripStop[] | null }) {
  const map = useMap();
  const marker = useRef<L.Marker | null>(null);
  const glow = useRef<L.Polyline | null>(null);
  const line = useRef<L.Polyline | null>(null);
  const stops = useRef<L.LayerGroup | null>(null);
  const waypoints = useRef<Waypoint[]>([]);
  const raf = useRef<number | null>(null);
  // The smoothed on-screen position. The rAF loop eases this toward the timeline
  // target every frame, so the ~12s re-anchor to a fresh GPS fix glides in rather
  // than teleporting — that snap was the only visible jitter.
  const displayed = useRef<{ lat: number; lng: number } | null>(null);

  const clearAll = () => {
    if (raf.current != null) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
    marker.current?.remove();
    glow.current?.remove();
    line.current?.remove();
    stops.current?.remove();
    marker.current = glow.current = line.current = null;
    stops.current = null;
    waypoints.current = [];
    displayed.current = null;
  };

  // Build / refresh geometry whenever the selection or its path changes.
  useEffect(() => {
    if (!selected) {
      clearAll();
      return;
    }

    const icon = L.divIcon({ className: "ttc-selected-marker", html: markerHtml(selected), iconSize: [0, 0] });
    if (!marker.current) {
      marker.current = L.marker([selected.lat, selected.lng], { icon, zIndexOffset: 3000, keyboard: false, interactive: false }).addTo(map);
    } else {
      marker.current.setIcon(icon); // position is driven purely by the rAF easing loop
    }

    // Anchor at the live position "now", then the future stops on the timeline.
    const nowSec = Date.now() / 1000;
    const upcoming = (path ?? []).filter((s) => s.time > nowSec + 1);
    const wps: Waypoint[] = [{ lat: selected.lat, lng: selected.lng, t: nowSec }];
    for (const s of upcoming) {
      const prev = wps[wps.length - 1];
      if (s.time > prev.t + 0.5) wps.push({ lat: s.lat, lng: s.lng, t: s.time });
    }
    // Dead-reckoning fallback: if this trip has no stop predictions but the
    // vehicle reports a heading + speed, project it forward so the dot still
    // glides realistically instead of sitting still between polls.
    if (wps.length === 1 && selected.speed && selected.speed > 0.5 && selected.bearing != null) {
      const horizon = 30; // seconds of look-ahead (poll re-anchors well before this)
      const distM = selected.speed * horizon;
      const brg = (selected.bearing * Math.PI) / 180;
      const dLat = ((distM * Math.cos(brg)) / 6371000) * (180 / Math.PI);
      const dLng = ((distM * Math.sin(brg)) / (6371000 * Math.cos((selected.lat * Math.PI) / 180))) * (180 / Math.PI);
      wps.push({ lat: selected.lat + dLat, lng: selected.lng + dLng, t: nowSec + horizon });
    }
    waypoints.current = wps;

    // Only draw the route line for a REAL upcoming-stop path (not the
    // dead-reckoning projection, which just nudges the marker).
    const latlngs: [number, number][] = upcoming.length ? [[selected.lat, selected.lng], ...upcoming.map((s) => [s.lat, s.lng] as [number, number])] : [];
    if (latlngs.length >= 2) {
      if (!glow.current) glow.current = L.polyline(latlngs, { color: selected.color, weight: 12, opacity: 0.16, lineCap: "round", lineJoin: "round", interactive: false }).addTo(map);
      else glow.current.setLatLngs(latlngs).setStyle({ color: selected.color });
      if (!line.current) line.current = L.polyline(latlngs, { color: selected.color, weight: 4, opacity: 0.92, lineCap: "round", lineJoin: "round", interactive: false }).addTo(map);
      else line.current.setLatLngs(latlngs).setStyle({ color: selected.color });
    } else {
      glow.current?.remove();
      line.current?.remove();
      glow.current = line.current = null;
    }

    if (!stops.current) stops.current = L.layerGroup().addTo(map);
    stops.current.clearLayers();
    upcoming.slice(0, 14).forEach((s, i) => {
      const isNext = i === 0;
      L.circleMarker([s.lat, s.lng], {
        radius: isNext ? 5.5 : 3.5,
        color: "#0A0A0A",
        weight: 2,
        fillColor: isNext ? "#ffffff" : selected.color,
        fillOpacity: 1,
        interactive: false,
      }).addTo(stops.current!);
    });
  }, [selected, path, map]);

  // Glide the marker along the waypoints at 60fps. Each frame we compute the
  // exact timeline target for the current wall-clock time, then ease the DISPLAYED
  // position toward it (exponential smoothing) so motion stays buttery and every
  // GPS re-anchor blends in instead of snapping. A large jump (vehicle switch)
  // teleports once, then resumes smoothing.
  useEffect(() => {
    if (!selected) return;
    let last = 0;
    const SNAP_DEG = 0.02; // ~1.5 km — beyond this it's a different vehicle, so jump
    const step = (ts: number) => {
      const wps = waypoints.current;
      const m = marker.current;
      if (m && wps.length) {
        const t = Date.now() / 1000;
        // 1) timeline target at time t
        let tlat = wps[0].lat;
        let tlng = wps[0].lng;
        if (wps.length > 1 && t > wps[0].t) {
          const end = wps[wps.length - 1];
          if (t >= end.t) {
            tlat = end.lat;
            tlng = end.lng;
          } else {
            for (let i = 0; i < wps.length - 1; i++) {
              const a = wps[i];
              const b = wps[i + 1];
              if (t >= a.t && t <= b.t) {
                const f = (t - a.t) / (b.t - a.t);
                tlat = a.lat + (b.lat - a.lat) * f;
                tlng = a.lng + (b.lng - a.lng) * f;
                break;
              }
            }
          }
        }
        // 2) ease the displayed position toward the target (frame-rate independent)
        const d = displayed.current;
        if (!d || Math.abs(tlat - d.lat) > SNAP_DEG || Math.abs(tlng - d.lng) > SNAP_DEG) {
          displayed.current = { lat: tlat, lng: tlng };
        } else {
          const dt = last ? Math.min(0.05, (ts - last) / 1000) : 1 / 60;
          const k = 1 - Math.exp(-dt / 0.28); // ~0.28s smoothing time-constant
          d.lat += (tlat - d.lat) * k;
          d.lng += (tlng - d.lng) * k;
        }
        const p = displayed.current;
        if (p) m.setLatLng([p.lat, p.lng]);
      }
      last = ts;
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [selected]);

  useEffect(() => () => clearAll(), []); // unmount cleanup
  return null;
}

/** Renders a non-interactive "you are here" marker that follows the user. */
function UserMarker({ pos }: { pos: LatLng | null }) {
  const map = useMap();
  const ref = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!pos) {
      ref.current?.remove();
      ref.current = null;
      return;
    }
    const html =
      `<div style="position:absolute;left:0;top:0;transform:translate(-50%,-50%);">` +
      `<span style="position:absolute;left:50%;top:50%;width:34px;height:34px;border-radius:50%;transform:translate(-50%,-50%);background:rgba(37,99,235,.25);animation:pulseRing 2.4s ease-out infinite;"></span>` +
      `<span style="position:relative;display:block;width:16px;height:16px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.55);"></span>` +
      `</div>`;
    const icon = L.divIcon({ className: "ttc-user-marker", html, iconSize: [0, 0] });
    if (!ref.current) {
      ref.current = L.marker([pos.lat, pos.lng], { icon, zIndexOffset: 2000, interactive: false }).addTo(map);
    } else {
      ref.current.setLatLng([pos.lat, pos.lng]);
      ref.current.setIcon(icon);
    }
  }, [pos, map]);

  useEffect(() => () => { ref.current?.remove(); }, []);
  return null;
}

/** Renders a pin at a searched stop/station, tip anchored on the coordinate. */
function StopMarker({ pos }: { pos: LatLng | null }) {
  const map = useMap();
  const ref = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!pos) {
      ref.current?.remove();
      ref.current = null;
      return;
    }
    const html =
      `<div style="position:absolute;left:0;top:0;transform:translate(-50%,-100%);">` +
      `<svg width="30" height="40" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">` +
      `<path d="M12 1C6 1 1 6 1 12c0 7.5 11 19 11 19s11-11.5 11-19C23 6 18 1 12 1z" fill="#7C3AED" stroke="#fff" stroke-width="2"/>` +
      `<circle cx="12" cy="12" r="4.2" fill="#fff"/></svg></div>`;
    const icon = L.divIcon({ className: "ttc-user-marker", html, iconSize: [0, 0] });
    if (!ref.current) {
      ref.current = L.marker([pos.lat, pos.lng], { icon, zIndexOffset: 1500, interactive: false }).addTo(map);
    } else {
      ref.current.setLatLng([pos.lat, pos.lng]);
      ref.current.setIcon(icon);
    }
  }, [pos, map]);

  useEffect(() => () => { ref.current?.remove(); }, []);
  return null;
}

/** Exposes imperative map controls to the parent via a ref. */
function MapBridge({ controls }: { controls: React.MutableRefObject<MapControls | null> }) {
  const map = useMap();
  useEffect(() => {
    controls.current = {
      recenter: () => map.setView(TORONTO, 12, { animate: true }),
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
      panTo: (lat, lng) => map.setView([lat, lng], Math.max(map.getZoom(), 14), { animate: true }),
      fitTo: (points) => {
        if (!points.length) return;
        map.fitBounds(L.latLngBounds(points), { padding: [70, 70], maxZoom: 15, animate: true });
      },
    };
    return () => {
      controls.current = null;
    };
  }, [map, controls]);
  return null;
}

export default function LeafletMap({ selected, path, showLabels, userPos, stopPin, onTilesLoad, controls }: LeafletMapProps) {
  const tileUrl = showLabels
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png";

  return (
    <MapContainer
      center={TORONTO}
      zoom={13}
      minZoom={10}
      maxZoom={19}
      zoomControl={false}
      className="absolute inset-0 h-full w-full"
      style={{ background: "#0A0A0A" }}
    >
      <TileLayer
        url={tileUrl}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
        eventHandlers={{ load: onTilesLoad }}
      />
      <SelectedVehicleLayer selected={selected} path={path} />
      <UserMarker pos={userPos} />
      <StopMarker pos={stopPin} />
      <MapBridge controls={controls} />
    </MapContainer>
  );
}
