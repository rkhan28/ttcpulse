# TTC Pulse

A premium, dark "civic-tech" live TTC companion built with Next.js, TypeScript,
and Tailwind CSS.

It's a multi-page app with a persistent liquid-glass navbar:

- **Home** (`/`) — fixed animated transit-network hero with mouse parallax, a custom
  mix-blend cursor, scroll-driven section reveals, sticky stacked feature cards with
  live ticking arrival boards, an animated phone mockup, a transit-data grid, a
  centered FAQ accordion, and a footer.
- **Live Map** (`/map`) — large map panel with animated routes, custom vehicle markers
  (subway / bus / streetcar), mode filters, search, map controls, a selected-vehicle
  card, and a nearby-arrivals side panel.
- **Routes** (`/routes`) — saved-commute cards with route strips, ETAs, delay risk, and
  Pulse tips, plus an "add commute" empty state.
- **Alerts** (`/alerts`) — Pulse summary, severity/mode filter chips, alert cards, and a
  designed empty state.
- **Ask Pulse** (`/ask`) — a working chat (live-data context panel + suggested prompts)
  that returns structured arrival-result cards. Never asks for numeric stop IDs.

## Tech

- [Next.js 14](https://nextjs.org/) (App Router) + React 18
- TypeScript
- Tailwind CSS 3
- [Lucide React](https://lucide.dev/) icons
- [Geist](https://vercel.com/font) font (sans + mono)

All transit data is mock data in `src/lib/data.ts`, structured so real
GTFS-RT / API responses can plug in later. Live behaviour (ticking arrivals, the
auto-playing demo chat, nav scroll state) lives in `src/lib/hooks.ts`.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint (next/core-web-vitals)
```

## Project structure

```
src/
  app/
    layout.tsx           # fonts, custom cursor, persistent nav
    globals.css          # Tailwind + keyframes + scroll-driven reveals + cursor
    page.tsx             # Home
    map/ routes/ alerts/ ask/   # app routes
  components/
    Nav.tsx, CustomCursor.tsx
    home/                # Hero, StatsSection, FeatureCards, AboutSection, DataGrid, Faq, Footer
    map/LiveMap.tsx
    alerts/AlertsCenter.tsx
    ask/AskPulse.tsx
  lib/
    data.ts              # mock data + Ask Pulse response logic
    hooks.ts             # useTicker, useDemoChat, useScrolled
```

## Notes

- The home scroll effects (fixed-hero zoom, the "unravel" reveal of the first section,
  and per-section entrances) use CSS scroll-driven animations
  (`animation-timeline`). Browsers without support fall back to fully-visible content.
- The custom cursor and parallax are only active for fine (mouse) pointers; reduced-motion
  is respected for the scroll/entrance animations.
