# PROJECT PLAN: "The Life of an AI Chip" — Interactive Scrollytelling Game

> Pasted into the repo root as the source-of-truth plan for this feature.
> Implementation note: the original plan assumed vanilla ES modules. This
> repository is a React + Vite + Tailwind + framer-motion SPA with a strict
> per-feature convention (`src/components/<Feature>/`, a `<Feature>Teaser`,
> and a lazy route in `App.jsx`). The feature was built in that idiom while
> honoring the plan's intent: inline SVG world map with transform-based
> pan/zoom (no tile services / API keys), three data-driven interaction
> systems, facts-schema stat cards, and reduced-motion graceful degradation.
> See `src/components/AIChipLife/` and `VERIFICATION-TODO.md`.

## Context

A single-page, scroll-driven interactive essay-game in which the reader builds a
frontier AI accelerator and discovers, choice by choice, that they never had a
choice. The core mechanic IS the thesis: at each chokepoint there is exactly one
live option. The ending is not a game: at Quincy the buttons stop.

## The eight scenes

1. Design (Santa Clara) — the one genuinely plural choice.
2. The machine (Veldhoven) — ASML EUV monopoly + guess (units shipped).
3. The optics (Oberkochen) — Zeiss SMT sole supplier; map recedes.
4. Fabrication (Hsinchu) — TSMC leading-edge share + guess (needs_verification).
5. Memory (Korea) — three-option honest oligopoly; HBM drops onto the die.
6. Packaging — CoWoS bottleneck; the single acknowledgment line lives here.
7. The crossing — the completed chip detaches and crosses the Pacific.
8. Quincy, Washington — no interaction. That is the point.

## Interaction systems

- Forced choice (the spine): one enabled option at each chokepoint.
- Guess-the-number (the hook): 3 guesses total, on the numbers that shock.
- Chip assembly (the thread): a persistent die diagram accretes components.

## Guardrails

- Facts are sacred: never adjust a verified figure from memory. Flag in VERIFICATION-TODO.md.
- No images from the web. Diagrams are original SVGs; photo slots are placeholders.
- Eight scenes, three interaction systems, three guesses. No fourth mechanic.
- No score, timer, leaderboard, or share-result mechanics, permanently.
