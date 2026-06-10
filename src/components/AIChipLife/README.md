# The Life of an AI Chip

An interactive scrollytelling game. The reader "builds" a frontier AI
accelerator and discovers, choice by choice, that they never had a choice. The
core mechanic is the thesis: every chokepoint offers exactly one live option.
At Quincy the buttons stop. Route: `/ai-chip`.

## Files

- `scenes.js` — the eight scenes: camera focus, map mode, drafted prose, and
  per-scene interaction + assembly config.
- `facts.js` — every number on the page, schema-driven (`value`, `source`,
  `verified`, `confidence`, `verifiedDate`, `reverifyDays`, …). `getFact`
  throws on an unknown id.
- `projection.js` / `worldGeometry.js` — equirectangular projection and the
  original, hand-authored low-poly world silhouettes (no web/basemap asset).
- `WorldMap.jsx` — inline SVG map, panned/zoomed via a CSS `transform` on the
  map group over a static `viewBox` (compositor-friendly; the viewBox is never
  animated). The continents are rendered twice (a +360° copy) so the camera can
  wrap across the antimeridian for the Pacific crossing.
- `ForcedChoice.jsx`, `GuessTheNumber.jsx`, `ChipAssembly.jsx` — the three
  interaction systems, all data-driven from `scenes.js` + `facts.js`.
- `StatCard.jsx` — one stat-card component; accepts a fact OBJECT only, so a
  stat slot can never display an unsourced literal.
- `SourcesFooter.jsx` — "Sources & verification", auto-generated from every fact.
- `Scene.jsx`, `useScrollScenes.js`, `index.jsx` — scene rendering, scroll
  activation/progress, and the orchestrator.

## Interaction budget (held)

- Eight scenes. Three interaction systems. Three guesses. No score, timer,
  leaderboard, or share-result, permanently.
- Guesses: EUV units shipped (scene 2), TSMC leading-edge share (scene 4),
  South Korea's share of ASML revenue (scene 5).

## Deviations from the original PLAN.md (and why)

1. **React, not vanilla ES modules.** This repo is a React + Vite + Tailwind +
   framer-motion SPA with a strict per-feature convention. The plan's intent
   (transform-based SVG map, three data-driven interaction systems, facts-schema
   stat cards, graceful degradation) is preserved in that idiom. Facts live in
   `facts.js` rather than `facts.yaml`.
2. **Third guess is the Korea revenue share, not rack power.** The plan named
   rack power draw as a guess, but it lives in scene 8 — which the plan also
   mandates be strictly non-interactive ("that is the point"). Scene 8's silence
   is the non-negotiable, so the third guess moved to another genuinely shocking
   number in an interactive scene. Rack power and scanner price still appear as
   flipped stat cards.
3. **No-JS fallback is partial.** True no-JS rendering is impossible for any
   page on this SPA. Reduced-motion IS fully honored: declarative forced
   choices, revealed guesses, static per-scene assembly diagrams, and a static
   map (see `prefers-reduced-motion`).
4. **Playwright not used.** The repo's test stack is vitest + Testing Library
   and CI gates on `npm run build`. Smoke coverage is provided as vitest tests
   in `__tests__/` (facts schema, scene structure, interaction behavior).
5. **Quincy photo + OG image are placeholders/post-launch**, per the plan's own
   guardrails. See `VERIFICATION-TODO.md`.
