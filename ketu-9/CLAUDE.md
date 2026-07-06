# Ketu-9 — project context

We are building a single-planet, No Man's Sky–style **vertical slice** in
React Three Fiber + Three.js, TypeScript, Vite. Not a full space sim. The magic
is the planet surface, the sky, and the seasonal swing.

## The planet (canon — respect this)
- Extreme axial tilt: a short sunless-never **Bright** and a long aurora-lit **Dark**
  (~1/3 Bright, 2/3 Dark year).
- 81% ocean / 19% land; land is shredded into fjords + a 10,000-island archipelago
  (the **Splinterlands**); nothing >40 km from sea. ~2/3 of land is dead glacial ice.
  One cold continental interior (the **Weld**) over a volcanic arc.
- Keystone: the **ember run** — trillions of fish surge up glacial rivers each Bright,
  hauling ocean nutrients inland. The forests grow on fish. Rivers glow during the run.
- Fauna: **drift-oxen** (house-sized instanced grazing herds; pack into a rotating
  thermal huddle in the Dark), **glassbears** (transparent, read as heat-shimmer /
  refraction), **lantern wolves** (Dark-only, aurora-lit, buried in Bright),
  **sugarfields** (warm, faintly-sweet ground cover that explodes in Bright, crusts
  over in Dark). **Vents** are hot-spring refugia — the only pockets the Dark never wins.

## Aesthetic pillars (every choice serves these)
1. Aerial perspective / depth fog is the whole look.
2. Two color scripts: Bright = warm gold; Dark = teal/violet/aurora-green.
3. Big silhouettes, clean readability, awe of scale.
4. Everything drifts — wind, herds, aurora, ice, rivers.
5. Volumetric light everywhere.

## Architecture rules
- One **WorldClock** (`src/world/WorldClock.ts`, `phase ∈ [0,1)`) drives EVERYTHING.
  Subscribe to it; derive visuals via the PURE helpers in `src/world/sun.ts`. Never
  store "what season it is" anywhere else.
- Terrain generation must express the lore (fjords, Weld, ice, vents), not generic noise.
- Prefer GPU instancing / compute for anything numerous (grass, herds).
- Keep it hot-reloadable and visually verifiable each milestone.
- Use `leva` for live-tuning; bake tuned values back into `config.ts` / `palettes.ts`.

## Renderer note
The seed uses the classic **WebGL + ShaderMaterial (raw GLSL)** path because handwritten
scattering is far less finicky there. Swapping to the WebGPU renderer / TSL is a later
optimization once the look is locked — do NOT do it mid-milestone.

## Current milestone
Milestones 0–3 are DONE (scaffold, atmosphere, WorldClock + sun spiral + fog crossfade,
chunked LOD terrain). M3 added `src/terrain/`: a deterministic heightfield
(`heightfield.ts` — 79% ocean, domain-warped fjords/Splinterlands, the Weld dome +
volcanic arc + vent refugia, glacial flattening above the snowline), biome
classification + placeholder vertex colors (`biome.ts`), and a camera-centered
quadtree of cached, skirted chunks (`Terrain.tsx`). Terrain/sea season tint derives
from `dayness()` per the WorldClock contract. Spawn (0,0) is a Splinterlands coast;
world offset + LOD knobs live in `TERRAIN` in `config.ts`.
**Next: Milestone 4 — triplanar PBR terrain shader + snowline + biome blend**
(replaces the vertex-color placeholder), per KETU-9-GAME-PLAN.md §7 and §8.
Do not regress the WorldClock contract.
