# Cosmos

**A premium interactive space exploration and learning platform for the web.**

Cosmos is an editorial, dark-only, production-ready MVP that lets anyone orbit
the Sun, step onto any planet, and compare worlds — grounded in public NASA /
JPL / launch data through a resilient internal data platform.

---

## Quick start

```bash
# 1. install
npm install

# 2. copy env template (all values are optional)
cp .env.example .env.local

# 3. run
npm run dev         # http://localhost:3000
```

Useful scripts:

- `npm run dev` — Next.js dev server
- `npm run build` — production build
- `npm run start` — start the production build
- `npm run typecheck` — TypeScript type check
- `npm run lint` — ESLint (Next config)

---

## Environment variables

All are optional. Cosmos ships with curated fallback fixtures so the app runs
and demos gracefully without any keys.

| Variable                     | Purpose                                                   |
|------------------------------|-----------------------------------------------------------|
| `NASA_API_KEY`               | NASA APOD key (defaults to `DEMO_KEY`).                   |
| `LAUNCH_LIBRARY_BASE_URL`    | Launch Library 2 base URL.                                |
| `SPACE_NEWS_BASE_URL`        | Spaceflight News API v4 base URL.                         |
| `NEXT_PUBLIC_SITE_URL`       | Canonical site URL used for OG/Twitter and the sitemap.   |

---

## Tech stack

- **Next.js 14 (App Router)** + **TypeScript** (strict, `noUncheckedIndexedAccess`)
- **Tailwind CSS** with a custom dark-only token system (`--background`, `--panel`, `--accent`, …)
- **Framer Motion** for UI motion, **Inter + Jost + JetBrains Mono** typography (Jost carries the cinematic geometric-sans voice)
- **Three.js** + **@react-three/fiber** + **@react-three/drei** for the 3D scene
- **Zustand** for scene / simulation state
- **Zod** for all schema validation (static data, external APIs, response envelope)
- `shadcn`-style handcrafted UI primitives (button, card, badge, headings) for visual consistency

---

## Folder structure

```
src/
├── app/
│   ├── (site)/                      ← editorial chrome (navbar + footer)
│   │   ├── page.tsx                 ← /
│   │   ├── planets/
│   │   │   ├── page.tsx             ← /planets
│   │   │   └── [slug]/page.tsx      ← /planets/[slug]
│   │   ├── compare/
│   │   │   ├── page.tsx
│   │   │   ├── size/page.tsx
│   │   │   ├── gravity/page.tsx
│   │   │   └── weight/{page.tsx, weight-calculator.tsx}
│   │   ├── today/page.tsx
│   │   └── about/page.tsx
│   ├── explore/                     ← full-viewport 3D experience (opt-out of site chrome)
│   │   ├── page.tsx
│   │   └── experience.tsx
│   ├── api/v1/
│   │   ├── bodies/route.ts
│   │   ├── bodies/[id]/route.ts
│   │   ├── apod/route.ts
│   │   ├── launches/route.ts
│   │   └── news/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   ├── not-found.tsx
│   ├── sitemap.ts
│   └── robots.ts
├── components/
│   ├── layout/                      ← navbar, footer, mark
│   ├── ui/                          ← button, card, badge, section-heading, loading, error
│   ├── content/                     ← planet-card, planet-stats-grid, planet-visual, last-updated, data-source-badge, feature-card
│   ├── space/                       ← solar-system-scene, sun, planet, orbit-line, starfield, camera-controller, selection-panel, time-control-bar, explore-hud, explore-sidebar
│   └── home/                        ← home-hero, home-hero-scene, home-today-preview, home-compare-preview
├── data-platform/
│   ├── schemas/                     ← body.ts (incl. Keplerian elements), apod.ts, launch.ts, news.ts, envelope.ts   (Zod)
│   ├── sources/                     ← bodies.ts, apod.ts, launches.ts, news.ts           (live adapters)
│   │                                  registry.ts                                         (provider registry)
│   │                                  jpl-horizons.ts, celestrak.ts                       (scaffolded phase-2 adapters)
│   ├── physics/                     ← kepler.ts (Kepler-equation solver + heliocentric positions)
│   │                                  constants.ts
│   ├── cache/                       ← memory.ts (TTL cache, ready for SWR/KV swap)
│   ├── resilience/                  ← fetch.ts (timeout + retry wrapper + SourceResult type)
│   └── envelope.ts                  ← buildEnvelope / jsonEnvelope helpers
├── data-static/
│   └── bodies.ts                    ← canonical celestial-body dataset (Zod-validated at import)
├── store/
│   ├── explore-store.ts
│   └── compare-store.ts
└── lib/
    ├── utils.ts
    └── site.ts
```

---

## Routes

| Route                       | Type                  | What it does                                                       |
|-----------------------------|-----------------------|--------------------------------------------------------------------|
| `/`                         | Static                | Cinematic hero with 3D hero scene + feature sections                |
| `/explore`                  | Client (R3F)          | Full-viewport interactive 3D Solar System                           |
| `/planets`                  | Static                | Editorial index of all planets + the Sun                            |
| `/planets/[slug]`           | Static (SSG)          | Planet detail pages with stats, atmosphere, moons, sources          |
| `/compare`                  | Static                | Hub for comparison tools                                            |
| `/compare/size`             | Static                | Relative planetary size bars                                        |
| `/compare/gravity`          | Static                | Surface-gravity comparison                                          |
| `/compare/weight`           | Static + client       | Interactive "what would you weigh on…" calculator                   |
| `/today`                    | SSR (5-min revalidate)| APOD + launches + news, integrity-tagged                            |
| `/about`                    | Static                | Mission, methodology, sources, roadmap                              |
| `/api/v1/bodies`            | Static                | All celestial bodies                                                |
| `/api/v1/bodies/[id]`       | Dynamic               | Single body by id                                                   |
| `/api/v1/apod`              | Dynamic               | NASA Astronomy Picture of the Day                                   |
| `/api/v1/launches`          | Dynamic               | Upcoming launches (Launch Library 2)                                |
| `/api/v1/news`              | Dynamic               | Recent space news (Spaceflight News API)                            |

All `/api/v1/*` endpoints return a consistent envelope:

```json
{
  "data": { ... },
  "meta": {
    "lastUpdated": "ISO",
    "fetchedAt":   "ISO",
    "integrity":   "fresh" | "cache" | "fallback",
    "provider":    "nasa.apod",
    "stale":       false
  },
  "attribution": [{ "source": "NASA APOD", "url": "..." }]
}
```

An `x-cosmos-integrity` response header mirrors the integrity tag so CDNs /
clients can key off it directly.

---

## Data architecture

External APIs are **never** called from React components. The flow is:

```
React component  →  Server route handler (/api/v1/*)  →  Adapter (data-platform/sources)
                                                            ↓
                                                       TTL cache → safeFetch (timeout + retry)
                                                            ↓
                                                        External API
                                                            ↓
                                                  Zod-normalised result
                                                            ↓
                                            { data, meta:{integrity:'fresh'|'cache'|'fallback'}, attribution }
```

- **Timeouts** — `safeFetch` aborts stale requests; `fetch.ts` is the single chokepoint for network I/O.
- **Retries** — simple exponential backoff at the adapter boundary.
- **Cache** — in-process TTL cache exposes stale/ fresh signals. Swappable for SWR / KV later without changing callers.
- **Fallbacks** — every adapter defines a curated `FALLBACK` so the site *always* renders a useful state.
- **Attribution + lastUpdated** — surfaced in the UI via `<DataSourceBadge />` and `<LastUpdatedLabel />`.

---

## What's fully implemented

- Full-site navigation, layout, typography, dark theme, accent system
- Home, Planets index, 10 planet detail pages (incl. Sun + Pluto), Compare hub, Compare / Size, Compare / Gravity, Compare / Weight, Today, About, 404
- 3D Solar System (`/explore`): Sun with corona + additive glow, 8 planets + Pluto, gradient orbit lines, starfield, click-to-select, **live camera tracking of moving bodies**, time controls, play/pause/speed, **"Real orbits" toggle for Kepler-solver positions**, simulation clock, selection panel with **keyboard navigation (Esc / ← / →)** and prev/next, responsive sidebar, HUD, WebGL error boundary with graceful fallback
- Cinematic full-screen loader for `/explore`
- Ambient 3D hero scene on the homepage
- **Kepler orbital-mechanics module** (`data-platform/physics/`) used by the scene when "Real orbits" is active — J2000 elements for all 8 planets + Pluto
- **Provider registry** (`data-platform/sources/registry.ts`) with metadata for every live and scaffolded source; surfaced in `/about`
- Internal API layer with `data / meta / attribution` envelope and integrity headers
- Real integrations (cached, with curated fallbacks) for NASA APOD, Launch Library 2, Spaceflight News API
- Unified attribution UI: `<LastUpdatedLabel />` integrity pill (fresh / cache / curated) and `<DataSourceBadge />` with tooltip licensing
- Responsive comparison bars (mobile + desktop layouts), responsive selection panel and HUD
- Zustand stores for exploration and comparison state
- SEO: metadata, OG/Twitter tags, sitemap, robots
- Accessibility: skip link, focus-visible ring, reduced-motion respect, keyboard nav through explore, descriptive labels

---

## Solar-system accuracy notes

The `/explore` scene has two modes:

1. **Visual (default)** — stylised circular orbits with angular speeds proportional to `1 / √period`. Readable, never to scale, always framed well.
2. **Real orbits** — heliocentric positions from the **Kepler solver** in `data-platform/physics/kepler.ts`, using published J2000 elements stored in `data-static/bodies.ts`.

Real-orbits mode is accurate to ≈ ±1% for the major planets within a century of J2000, which is ideal for teaching and time-lapse animation but is *not* ephemeris-grade. For arcsecond-level accuracy, wire up the **JPL Horizons adapter** (scaffolded in `data-platform/sources/jpl-horizons.ts`) and swap the `heliocentricPosition()` call in `components/space/planet.tsx` — the rendering contract stays identical.

---

## What is intentionally scaffolded for future phases

- **JPL Horizons adapter** (`data-platform/sources/jpl-horizons.ts`) — typed surface, documented integration plan, throws loudly today. Enable by implementing `getHeliocentricPosition()` and pointing `Planet` at it in real-orbits mode.
- **CelesTrak / SGP4 adapter** (`data-platform/sources/celestrak.ts`) — same pattern, for a future satellite-orbit view.
- **Stale-while-revalidate** — `memoryCache` exposes a `stale` flag; the envelope carries `meta.stale`. Upgrade path: swap `memoryCache` for a KV/Redis adapter without touching adapters.
- **Textured planet surfaces** — `PlanetVisual` and `Planet` share a typed body model; swapping to glTF + textures is localised.

---

## Design guardrails the code enforces

- Dark-only palette through CSS variables; no ad-hoc colors in components.
- One accent color (electric cyan) with sparse, meaningful usage.
- Typography hierarchy from two families only (Inter + Jost) plus one mono.
- No neon, no sci-fi gimmick fonts, no random particle noise.
- 3D scene respects PerformanceMonitor + AdaptiveDpr for reliability on lower-end devices.

---

## License / attribution

Cosmos references publicly available data from NASA, JPL, ESA and the open
space community. Nothing in this project is affiliated with those
organisations. See the `/about` page for per-source attribution.
