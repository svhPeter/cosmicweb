# Cosmos — Explore / Solar System: Senior Engineering Review

**Purpose:** Handoff document for senior developer review — architecture, correctness model, known sharp edges, and prioritized follow-ups.  
**Scope:** `/explore` experience, R3F solar system scene, galactic frame, simulation clock, Earth–Moon subsystem, related store/state.  
**Out of scope:** Full marketing site audit, all `/api` routes unless noted.

---

## 1. Executive summary

Cosmos ships a **Next.js App Router** client with a **deferred WebGL bundle** (`next/dynamic`, `ssr: false`) for the solar system. The scene is **React Three Fiber** + **drei** + custom **shader materials** and a deliberate split between:

- **Zustand** (`useExploreStore`) — UI/simulation toggles, focus/selection, playback.
- **Mutable singletons** (`galacticState`, `bodyPositions` Map) — per-frame data that must not trigger React re-renders every tick.

The product goal is **educational credibility** (Keplerian orbits, documented galactic motion constants) with **composed readability** (non–true-scale radii, tiered GPU budgets).

**Strengths:** Clear separation of simulation clock (`SimulationTimeController`), documented galactic physics constants in `galactic-state.ts`, trail ring-buffer design avoids a known aliasing bug (commented in `planet-trails.tsx`), dynamic code-splitting for the heavy scene.

**Gaps:** No automated **unit/integration/visual** test suite in `package.json` (only `lint`, `typecheck`, `build`). Galactic + pause semantics are **correct by design** but easy to misread as bugs. Multiple independent toggles (`useRealOrbits`, `galactic`, `earthMoonScaleMode`, `playing`, `speed`) multiply QA states.

---

## 2. Architecture map

| Layer | Responsibility | Primary locations |
|-------|----------------|-------------------|
| Route shell | Layout, sidebar, URL `?focus=`, Esc handling vs drawer | `src/app/explore/experience.tsx` |
| Scene composition | Canvas, fog, lights, tiered starfields, heliocentric group vs world-space overlays | `src/components/space/solar-system-scene.tsx` |
| Time | Single `simulationJd` advance per frame when `playing` | `src/components/space/simulation-time-controller.tsx` |
| Positions | Kepler vs stylised circular; world position registry | `src/components/space/planet.tsx`, `src/data-platform/physics/kepler.ts`, `src/store/explore-store.ts` (`bodyPositions`) |
| Galactic frame | Drift + ecliptic tilt of heliocentric group; `revealT` easing | `src/components/space/galactic-controller.tsx`, `src/store/galactic-state.ts` |
| Helix read | World-space trails sample `bodyPositions` | `src/components/space/planet-trails.tsx` |
| Camera | Focus follow, galactic reframe, drift compensation | `src/components/space/camera-controller.tsx` |
| Earth–Moon | World-anchored to Earth’s reported position; focus-gated UX | `src/components/space/earth-moon-system.tsx`, `src/lib/space/lunar-orbit.ts` |
| Static content | Canonical bodies, render hints, optional `orbitalElements` | `src/data-static/bodies.ts` |

**Dependency direction (healthy):** Scene → store + physics lib; trails/dust/orbits → `galacticState` + `bodyPositions`; no circular import observed in sampled paths.

---

## 3. State and concurrency model

### 3.1 Zustand (`useExploreStore`)

Holds durable UI/simulation state: `playing`, `speed`, `simulationJd`, `useRealOrbits`, `galactic`, `earthMoonScaleMode`, focus/selection/hover IDs.

**Senior note:** Subscribing components re-render on any changed slice; high-frequency data intentionally **not** stored here.

### 3.2 `bodyPositions` (module-level `Map`)

Updated every frame from `Planet` (and Sun) via `reportBodyPosition`. Consumers that need live positions should read the **Map** or refs updated in `useFrame`, not assume Zustand contains world matrices.

**Risk:** Any new body (e.g. moon as first-class focus) must **report** consistently or camera/trails break silently.

### 3.3 `galacticState` (mutable object)

Updated only inside `GalacticController`’s `useFrame`. Documented fields: `revealT`, `drift`, `motionDir`, `tiltAxis`, `tiltAngleRad`, speed constants.

**Risk:** This is **global mutable state** — hot reload, strict mode double-mount, or future multiple canvases could cause cross-talk. Today single canvas mitigates.

---

## 4. Simulation correctness

### 4.1 Time integration

- `SimulationTimeController`: `simulationJd += delta * speed` when `playing` (clamped delta). **Single writer** — fixes prior N-body duplicate advancement (documented in file).

### 4.2 Orbital positions

- `Planet` uses `heliocentricPosition(elements, simulationJd)` when `useRealOrbits && body.orbitalElements`, with axis remap **ecliptic (x,y,z) → scene (x,z,-y)** so the ecliptic matches the stylised XZ layout.
- Bodies **without** elements fall back to circular visual orbit even if `useRealOrbits` is true (implicit branch).

**Recommendation:** Log or dev-overlay when `useRealOrbits` is true but `orbitalElements` is missing for a planet — avoids silent fallback in QA.

### 4.3 Galactic drift vs simulation time

`GalacticController` integrates drift using:

- `dtDays = delta * speed` (same convention as JD advancement),
- `driftAu = (sunSpeedKmS * dtSec) / AU_KM`,
- scaled by `auToScene` and `revealT`.

**Critical product rule:** Drift accumulates only when **`galactic && playing`**. Paused mode freezes **both** orbit advancement and galactic drift. This matches comments in `GalacticController` but differs from a naive user expectation (“only pause orbits”).

**Senior review question:** Should pause mean “freeze JD but still drift” for illustration? If yes, that is a **spec change** requiring split of clock vs frame motion.

---

## 5. Galactic / helical visuals

### 5.1 Why a helix appears

Heliocentric content lives in `heliocentricFrameRef` which **translates** (`drift`) and **rotates** (ecliptic tilt vs galactic plane). `PlanetTrails` lives **outside** that group and records **world** positions → combined motion draws a helix when both orbit and drift are active.

### 5.2 Trail opacity and emphasis

`PlanetTrails` fades out when `revealT < 0.0025`; opacity scales with eased `revealT`. When a body is focused/selected, **emphasized** trail is brighter; others dim. This can look like “missing spirals” for outer planets during focus.

### 5.3 Known footguns for QA

| Symptom | Likely cause |
|---------|----------------|
| No helix | `playing === false` or `galactic` off or `revealT` still ~0 |
| Weak helix | Low `speed`; inner planets coil tightly (short trail buffer) |
| “Only one planet spirals” | Focus/selection emphasis + opacity |
| Lighting shimmer on terminators | Was mitigated by syncing `sunWorld` from `bodyPositions` before child `useFrame` — regression if order changes |

---

## 6. Earth–Moon subsystem

- Rendered **outside** the drifting heliocentric group; each frame reads Earth’s world position from `bodyPositions` so it **inherits galactic motion** without double-transform bugs.
- **Scale mode** toggles visual vs ~60 Earth-radii separation — educational, independent of galactic/real orbits.
- Focus gating (distance thresholds / opacity) drives fade of orbit ring, connector, ruler — verify interaction with `focusedBodyId` / `selectedBodyId` including **`moon`** IDs (see `Planet` focus ring exception for Earth when moon selected).

**Review focus:** Pointer events, `reportBodyPosition` for `moon` if any code path expects it for camera (grep consumers).

---

## 7. Performance and runtime

- **Tier hook** (`useDeviceTier`) adjusts DPR, starfield counts, antialias — sensible defensive pattern.
- **Post-processing** (`PostFX`) — verify cost on low-tier devices; no automated perf budget in CI.
- **Multiple `Starfield` instances** — acceptable if counts are tier-capped; watch draw calls if expanded.

---

## 8. Testing and quality gates

Current `package.json` scripts: **`lint`**, **`typecheck`**, **`build`** only.

| Gap | Suggested minimum |
|-----|-------------------|
| Kepler solver | Unit tests: known JD → expected position (few bodies, regression vectors) |
| `galacticState` / drift | Pure fn tests for AU/day ↔ scene drift at fixed `auToScene` |
| R3F integration | Smoke: mount scene with mock canvas or Playwright WebGL-enabled (optional, flaky) |
| Visual | Snapshot only if team accepts flakiness; prefer deterministic shader uniform tests |

---

## 9. Security / ops (brief)

- Static facts and NASA URLs in `bodies.ts` — low risk.
- `/api/*` routes (if deployed) should follow standard Next.js input validation and rate limits — **not audited in this document**; spot-check if public.

---

## 10. Prioritized recommendations

### P0 — Before treating reports as bugs

1. Document **pause + galactic** behaviour in HUD tooltip or onboarding (one sentence: “Pause freezes orbital time and galactic drift.”).
2. Add **dev-only** overlay or query flag logging: `playing`, `galactic`, `revealT`, `simulationJd`, `speed` — speeds up field bug triage.

### P1 — Engineering hardening

1. Unit tests for `heliocentricPosition` and drift integration constants (match `galactic-state.ts` exports).
2. Assert every `planet` id in scene either has `orbitalElements` or explicit “visual-only” comment in data.

### P2 — Product polish

1. Trail tuning when `emphasizedId != null` (some users want all helices visible in overview).
2. Consider extracting galactic logic into a small class or reducer for testability (optional; avoid over-refactor).

---

## 11. Appendix — files to read first

1. `src/app/explore/experience.tsx` — dynamic scene, error boundary, focus URL.
2. `src/components/space/solar-system-scene.tsx` — scene graph, tiers, frame group vs trails.
3. `src/store/explore-store.ts` — API surface for UI.
4. `src/store/galactic-state.ts` — constants + field meanings.
5. `src/components/space/galactic-controller.tsx` — drift/tilt/reveal integration.
6. `src/components/space/planet.tsx` — position modes, sun sync, custom renderers.
7. `src/components/space/planet-trails.tsx` — helix recording, emphasis, ring buffer.
8. `src/components/space/camera-controller.tsx` — galactic reframe, follow behaviour.
9. `src/components/space/earth-moon-system.tsx` — binary subsystem.
10. `src/data-static/bodies.ts` — source of truth for elements and render hints.

---

*Generated for internal review. Update this doc when galactic pause semantics or time integration contract changes.*

---

## 12. Launch hardening pass (2026-05-09)

### Triage: P0 / P1 / P2 (this pass)

| Tier | Items |
|------|--------|
| **P0** | Missing default OG image (`/og/cosmos.png` 404); `npm run lint` broken on Next 16 (`next lint` removed from CLI — was mis-parsed as project dir `lint`). |
| **P1** | `prefers-reduced-motion` → low device tier; `?exploreDebug=1` overlay; dev `console.warn` when Real orbits + missing `orbitalElements`; HUD / control tooltips for pause + galactic helix semantics; optional-chaining on `sunDriftRef`; `useDeviceTier` refactored to `useSyncExternalStore`; dead `ExploreHud` props removed. |
| **P2** | Full-repo ESLint green (70+ legacy findings: `react/no-unescaped-entities`, `react-hooks/immutability`, etc.); dedicated 1200×630 branded OG image; Kepler / drift unit tests; trail emphasis tuning. |

### P0 fixed

- **`site.ogImage`**: pointed at an existing file under `public/` (`/textures/earth/earth_day_2048.jpg`, 2048×1024) and aligned OpenGraph dimensions in `src/app/layout.tsx` so crawlers do not 404.
- **Lint script**: added root `eslint.config.mjs` using `eslint-config-next` flat configs (`core-web-vitals` + `typescript`); `package.json` `lint` runs ESLint on that config plus **touched /explore-critical paths only** until the wider tree is cleaned up.

### P1 done

- **`useDeviceTier`**: `prefers-reduced-motion: reduce` maps to **`low`** (same budgets as phones: capped DPR, no near `Starfield`, no `PostFX`).
- **`/explore?exploreDebug=1`**: fixed-position readout of `playing`, `galactic`, `revealT`, `speed`, `simulationJd`, toggles, focus/selection (`ExploreDebugOverlay` + `experience.tsx`).
- **`Planet`**: in development, one **`console.warn` per body** when `useRealOrbits` is on and a `planet` / `dwarf_planet` lacks `orbitalElements` (stylised fallback is intentional; silence in production).
- **`GalacticController`**: `sunDriftRef.current?.copy(...)` to avoid a rare null deref.
- **Copy / a11y**: pause + galactic tooltips and `aria-label` on `TimeControlBar`; extended galactic chip tooltip in `ExploreHud`.
- **`ExploreHud`**: removed unused `useEffect` import and unused `onToggleSidebar` / `sidebarOpen` props (sidebar is toggled from `experience.tsx` only).

### P2 deferred

See table above.

### Files changed (this pass)

`eslint.config.mjs`, `package.json`, `src/app/explore/experience.tsx`, `src/app/layout.tsx`, `src/lib/site.ts`, `src/lib/use-device-tier.ts`, `src/components/space/explore-debug-overlay.tsx`, `src/components/space/explore-hud.tsx`, `src/components/space/galactic-controller.tsx`, `src/components/space/planet.tsx`, `src/components/space/time-control-bar.tsx`, `docs/audit-cosmos-explore-senior-review.md` (this section).

### Routes verified (glob + build output)

Present under `src/app` / build: `/`, `/explore`, `/planets`, `/planets/[slug]` (includes **`/planets/moon`** via `slug: moon`), `/concepts`, `/black-hole`, `/wormhole`, `/neutron-star`, `/today`, `/compare` (+ `/compare/gravity`, `/compare/size`, `/compare/weight`), `/about`, `/api/*`, `robots.txt`, `sitemap.xml`.

### Explore matrix (manual QA notes)

- **Pause**: freezes **both** `simulationJd` (`SimulationTimeController`) and galactic drift (`GalacticController` gated on `playing`) — unchanged, now documented in UI strings.
- **Helices**: need **Play**, **Galactic**, and **`revealT`** past the trail threshold (~0.0025 in `PlanetTrails`); HUD tooltip states this.
- **Earth/Moon**: `bodyPositions` for `earth`, `moon`, `sun`; moon reported from `EarthMoonSystem`; camera branches for moon + scale mode unchanged.

### Assets / licensing

- Critical `/textures/*` and `/audio/explore-ambient.mp3` paths used by `/explore` resolve under `public/` (spot-checked via `find public`).
- **OG image** is now the same NASA-derived Earth albedo already shipped for the globe (`bodies.ts` / texture stack cite NASA/JPL fact sheets). No new `ASSETS.md`; add a dedicated OG card later if marketing needs a non-science crop.

### Commands (2026-05-09)

| Command | Result |
|---------|--------|
| `npm run typecheck` | Pass |
| `npm run build` | Pass |
| `npm run lint` | Pass (scoped file list; full-tree ESLint still fails on pre-existing files) |

### Remaining risks

- **Global `galacticState` + `bodyPositions`**: still mutable singletons (documented tradeoff); hot reload / multi-canvas would be fragile.
- **Scoped lint**: CI must not assume `eslint .` is green until P2 cleanup.
- **OG for social**: works and is honest-sized; not a designed marketing card.

### Verdict

**Staging-ready** for orgs that require repo-wide lint + bespoke OG creative. **Launch-ready** for the interactive product path (`/explore` + static routes) given typecheck/build pass and no critical asset 404s on referenced `/explore` media.
