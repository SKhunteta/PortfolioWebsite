# Ketu-9 seed — what's in here & how to run it

This is a **runnable Milestone 0–2 foundation**. It boots to a scattering sky that
responds to a season clock: scrub the year and watch peak-Bright gold spiral down
through a golden-hour hinge into deep-indigo Dark, with the fog, ambient light, and
sun color crossfading the whole way.

## Run it
```bash
npm install
npm run dev
```
Open the URL Vite prints. Use the **Leva panel** (top-right) to scrub `World Clock →
scrub`, toggle `running`, or change `seconds / year`. `Atmosphere` folder tunes
`sunIntensity` / `exposure`.

## What works
- `src/world/WorldClock.ts` — the single `phase ∈ [0,1)` store. Everything derives from it.
- `src/world/sun.ts` — pure sun-path math (elevation spiral, azimuth sweep, dayness,
  light color/intensity, season label). Deterministic and scrub-safe.
- `src/world/config.ts` / `palettes.ts` — all tunables + the Bright/Dark color scripts.
- `src/sky/` — Nishita-style Rayleigh+Mie single-scattering atmosphere on a
  camera-centered sky dome.
- `src/App.tsx` — scene: clock driver, sun-driven directional + hemisphere light,
  seasonal FogExp2 (aerial perspective), a placeholder ground plane, OrbitControls,
  and a minimal season HUD.

## What's intentionally NOT here yet (Fable's job — see KETU-9-GAME-PLAN.md §8)
Terrain (M3), terrain PBR shader (M4), PostFX beauty stack (M5), ocean + ember-run
rivers (M6), sugarfields (M7), aurora (M8), drift-oxen herds (M9), player controller +
scanner (M10), glassbears + lantern wolves (M11), polish (M12).

## The one contract not to break
`WorldClock.phase` drives the world. New systems **subscribe** to it and derive their
look through `sun.ts` helpers (or new pure helpers alongside them). Don't scatter
season state across components. That single discipline is what keeps the Bright/Dark
swing coherent as the world grows.

## Renderer
Classic WebGL + raw-GLSL ShaderMaterial for now (see CLAUDE.md → Renderer note).
WebGPU/TSL is a later swap once the visual target is locked.
