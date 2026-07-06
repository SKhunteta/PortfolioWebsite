# KETU-9 — "The Long Cold"
### A procedurally-rendered planet vertical slice — build plan for Claude Code

> **What this is:** a design + engineering plan for a walkable/flyable single-planet experience with a No Man's Sky–grade atmospheric look. Scoped deliberately as a **vertical slice**, not a full space-sim, because the gorgeous part is the *planet surface*, the *sky*, and the *Bright/Dark cycle* — and that's achievable by one person with an AI pair.
>
> **How to use it:** drop this file at the repo root, copy the `CLAUDE.md` seed (§9) into place, then feed Claude Code the milestone prompts in §10 one at a time. Each milestone is independently runnable and visually verifiable.

---

## 1. The pitch

You wake on the coast of the **Splinterlands** — a fractal archipelago where nothing is more than 40 km from saltwater — at the hinge of the seasons. For the first act, the sun never sets: the **Bright**. The sugarfields are warm underfoot and faintly sweet, drift-oxen herds smear across the tundra like weather, and the glacial rivers run silver with the **ember run**. Then, over real playtime, the sun spirals down and doesn't come back. The **Dark** falls, the aurora ignites, the sugarfields crust over, and a completely different world wakes up under starlight.

The whole game is about one idea: **nothing here is adapted to conditions — everything is adapted to the swing.** The player experiences the swing.

**Core loop (slice):** traverse (walk / glide / small skiff) → observe & scan the ecosystem → the world-clock advances the season → the same terrain transforms → traverse it again as a different place.

No combat in the slice. The antagonist is the planet's cycle.

---

## 2. Aesthetic pillars — what makes it "gorgeous"

These are the non-negotiables. Every technical decision serves them.

1. **Aerial perspective is the whole look.** The NMS/Ghibli painterliness comes from *distance*. Layered atmospheric fog, hue-shifted toward the sky color with depth, so far mountains dissolve into the horizon. If you get this and nothing else, it already reads as beautiful.
2. **Two color scripts, one world.** The Bright is warm — honeyed gold, sun-flare, saturated sugarfield greens. The Dark is cold — teal, violet, aurora-green, deep indigo shadow. A per-season color-grade LUT is the single biggest mood lever.
3. **Big silhouettes, clean readability.** House-sized drift-oxen, transparent glassbears you read as *shimmer*, kilometers-long herds. Scale is the awe.
4. **Everything drifts.** Wind through sugarfields, herd movement, aurora ribbons, calving ice, river flow. A static frame should never exist.
5. **Volumetric light.** God rays through low sun, fog catching the aurora, light shafts in the fjords. Cheap to fake, enormous payoff.

---

## 3. Tech stack (recommended) + rationale

**Primary recommendation: React Three Fiber + Three.js (WebGPU renderer, WebGL2 fallback), TypeScript, Vite.**

Why this over Unity/Godot for *this project*:
- **Tightest Claude-Code loop.** The whole thing is text files. Claude can edit a shader, you hot-reload in the browser in <1s, iterate. This is the single biggest reason.
- **WebGPU** gives you compute shaders (procedural terrain, GPU instancing for herds/grass) and modern rendering without native toolchains.
- **`@react-three/postprocessing`** (pmndrs) ships the exact NMS-look stack out of the box: bloom, depth-of-field, chromatic aberration, vignette, LUT color grading, SSAO, god rays.
- **`@react-three/drei`** gives you sky, environment, instancing helpers, camera controls — massive head start.
- Shareable as a URL. No build/distribution friction while iterating.

**Alternative (if you'd rather lean on your C# strength): Unity 6 + HDRP.** Better raw fidelity ceiling and volumetric clouds are first-class, and you already write C#. Trade-off: slower AI-assisted iteration loop (Claude can't hot-reload a Unity scene), and the gorgeous-fast advantage above mostly evaporates. Pick this only if you already know you want to ship natively later.

The rest of this plan assumes the R3F stack. It ports conceptually to Unity if you switch.

**Dependencies:**
```
three                     // core, use WebGPURenderer
@react-three/fiber        // React renderer for three
@react-three/drei         // helpers: Sky, Environment, Instances, useTexture
@react-three/postprocessing  // the beauty stack
three-stdlib              // extra loaders/controls
leva                      // live-tweak UI for tuning (dev only)
simplex-noise / open-simplex-noise  // CPU noise for seeding
zustand                   // world-clock + game state store
vite, typescript
```

---

## 4. Repo structure

```
ketu-9/
├─ CLAUDE.md                  # seed context — see §9
├─ KETU-9-GAME-PLAN.md        # this file
├─ index.html
├─ vite.config.ts
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx                 # <Canvas> + scene composition
│  ├─ world/
│  │  ├─ WorldClock.ts        # season phase [0..1], drives everything
│  │  ├─ config.ts            # planet constants (axial tilt, radius, palettes)
│  │  └─ palettes.ts          # Bright/Dark color scripts + LUT refs
│  ├─ terrain/
│  │  ├─ Terrain.tsx          # chunked LOD terrain mesh
│  │  ├─ heightfield.ts       # noise → elevation (fjords, Weld, ice sheets)
│  │  ├─ biome.ts             # elevation+latitude+moisture → biome id
│  │  └─ shaders/terrain.glsl # triplanar PBR, snowline, sugarfield blend
│  ├─ sky/
│  │  ├─ Atmosphere.tsx       # scattering sky dome
│  │  ├─ Aurora.tsx           # Dark-only volumetric ribbons
│  │  └─ shaders/scatter.glsl
│  ├─ water/
│  │  ├─ Ocean.tsx            # fjord sea, screen-space reflection-ish
│  │  └─ River.tsx            # ember-run flow, glowing during Bright
│  ├─ life/
│  │  ├─ Sugarfields.tsx      # GPU-instanced wind grass, Bright-only
│  │  ├─ DriftOxen.tsx        # instanced herd w/ boids + huddle behavior
│  │  ├─ Glassbear.tsx        # refraction/shimmer material
│  │  └─ LanternWolves.tsx    # Dark-only, emissive, aurora-lit
│  ├─ player/
│  │  ├─ Controller.tsx       # walk / glide / skiff modes
│  │  └─ Scanner.tsx          # the "observe" verb → codex entries
│  ├─ post/
│  │  └─ PostFX.tsx           # bloom, DoF, CA, vignette, LUT, god rays
│  └─ ui/
│     ├─ Codex.tsx            # discovered species/phenomena
│     └─ SeasonHUD.tsx        # phase-of-year indicator
└─ public/
   └─ luts/                   # bright.cube, dark.cube color grades
```

---

## 5. The signature system: the World Clock

Everything reads from one value. **This is the heart of the game — build it first.**

`WorldClock` exposes `seasonPhase ∈ [0, 1]`:
- `0.00–0.40` → **Bright** (sun spirals high, never sets)
- `0.40–0.50` → **Fall hinge** (sun descends to horizon, long golden hour)
- `0.50–0.90` → **Dark** (sun below horizon, aurora active)
- `0.90–1.00` → **Rise hinge** (dawn returns)

Slice length: compress a "year" to ~20–30 minutes of playtime, with an option to scrub manually (for dev *and* as a player telescope/meditation mechanic).

Everything subscribes:
- **Sun elevation & azimuth** → spiral path, not an arc (high-tilt planet).
- **Color grade LUT** → crossfade Bright ↔ Dark.
- **Atmosphere tint** → Rayleigh coefficients shift warm→cold.
- **Sugarfields** → density/height lerps to 0 (crust over) entering Dark.
- **Aurora** → opacity 0 in Bright, full in Dark, magnetically animated.
- **Fauna spawn tables** → drift-oxen graze in Bright, form the thermal huddle in Dark; lantern wolves buried in Bright, hunting in Dark.
- **River emissive** → ember run glows during Bright spawn, dims after.

---

## 6. Procedural world — tie generation to the lore

Don't generate generic terrain. Generate *Ketu-9*.

**Heightfield (`heightfield.ts`):**
- Base: layered simplex FBM.
- **Fjords / Splinterlands:** run domain-warped ridged noise, then aggressively erode below a sea threshold → drowned valleys, thread-thin islands. Target the "no interior >40 km from sea" feel by keeping landmass thin and shredded.
- **The Weld:** one high continental mass over a volcanic arc — a large-scale low-frequency dome with hot-spring vent hotspots (emissive, always-thawed refugia even in Dark).
- **Ice sheets:** ~⅔ of land above the snowline is glacial — high albedo, near-dead, slow-flowing (animate a subtle downhill UV drift).

**Biome (`biome.ts`)** from `elevation × latitude × distance-to-sea × vent-proximity`:
- `sugarfield_tundra` — warm coastal lowland, Bright-explosive.
- `fjord_shore` — the living green rind; densest life.
- `glacier` — ice, dead, beautiful.
- `weld_interior` — cold, strange, isolated endemics.
- `vent_refugium` — thawed pockets, emissive, life persists into Dark.

**Chunked LOD:** quadtree chunks around the camera, morph LOD to kill popping. WebGPU compute shader generates heights on GPU where possible; CPU noise only for seeding/gameplay queries.

---

## 7. The beauty pipeline (PostFX order matters)

In `PostFX.tsx`, compose in this order:
1. **SSAO** (subtle — contact shadows, don't crush it)
2. **God rays / volumetric light** from the sun (huge in Bright, from aurora in Dark)
3. **Bloom** (threshold high, soft — ice glints, river glow, emissive vents)
4. **Depth of Field** (gentle, cinematic — sells scale)
5. **LUT color grade** (the Bright/Dark crossfade — biggest single lever)
6. **Chromatic aberration** (barely there, edges only)
7. **Vignette + film grain** (unify, add "shot on film" cohesion)

**Atmosphere (`scatter.glsl`):** implement Rayleigh + Mie single-scattering sky dome, with **aerial perspective applied to terrain** (fog color = sampled sky color at that view ray, blended by depth). This is the one shader to get right. Everything downstream looks expensive once this lands.

**Glassbear material:** transmission/refraction (Three's `MeshPhysicalMaterial` transmission or a custom refraction pass), near-zero diffuse, so it reads as a heat-shimmer distortion against the ice — visible mainly by the way it *bends* the background. Make players *learn to see it*.

---

## 8. Milestone roadmap (each is a Claude Code session)

| # | Milestone | You should see | Depends on |
|---|-----------|----------------|-----------|
| 0 | Scaffold: Vite + R3F + WebGPU canvas, orbit camera, gray sphere | It runs, hot-reload works | — |
| 1 | **Atmosphere** sky dome + aerial-perspective fog | A gorgeous empty horizon | 0 |
| 2 | **WorldClock** + sun spiral + Bright/Dark LUT crossfade | Time-of-year scrubbing changes mood | 1 |
| 3 | **Terrain** chunked LOD heightfield (fjords + Weld + ice) | A real Ketu-9 landscape | 1 |
| 4 | Triplanar PBR terrain shader + snowline + biome blend | Landscape reads as tundra/ice/shore | 3 |
| 5 | **PostFX** full beauty stack | It looks *shot*, not rendered | 1,2 |
| 6 | **Ocean + ember-run rivers** (rivers glow in Bright) | The fjord seas, silver rivers | 3 |
| 7 | **Sugarfields** GPU-instanced wind grass, phase-driven | Fields erupt in Bright, crust in Dark | 2,4 |
| 8 | **Aurora** volumetric ribbons, Dark-only | The Dark becomes beautiful | 2,5 |
| 9 | **Drift-oxen** instanced boid herd + Dark huddle | Living megafauna on the move | 4 |
| 10 | **Player controller** (walk/glide/skiff) + **Scanner** codex | You can *be there* and record it | 4,6 |
| 11 | **Glassbear** shimmer + **lantern wolves** (Dark) | The two-planet fauna completes | 8,9 |
| 12 | Polish: Leva-tuned palettes, LUT bake, perf pass, audio bed | The vertical slice | all |

Ship-worthy demo after **8**. Everything past that is depth.

---

## 9. CLAUDE.md seed (copy into repo root)

```markdown
# Ketu-9 — project context for Claude Code

We are building a single-planet, No Man's Sky–style **vertical slice** in
React Three Fiber + Three.js (WebGPU renderer, WebGL2 fallback), TypeScript, Vite.
Not a full space sim. The magic is the planet surface, the sky, and the seasonal swing.

## The planet (canon — respect this)
- Extreme axial tilt: a 4-month sunless-never **Bright** and an 8-month aurora-lit **Dark**.
- 81% ocean / 19% land; land is shredded into fjords + a 10,000-island archipelago
  (the **Splinterlands**); nothing >40 km from sea. ~⅔ of land is dead glacial ice.
  One cold continental interior (the **Weld**) over a volcanic arc.
- Keystone: the **ember run** — trillions of fish surge up glacial rivers each Bright,
  hauling ocean nutrients inland. The forests grow on fish. Rivers glow during the run.
- Fauna: **drift-oxen** (house-sized instanced grazing herds; pack into a rotating thermal
  huddle in the Dark), **glassbears** (transparent, read as heat-shimmer/refraction),
  **lantern wolves** (Dark-only, aurora-lit, buried in Bright), **sugarfields** (warm,
  faintly-sweet ground cover that explodes in Bright, crusts over in Dark).
- **Vents** are hot-spring refugia — the only pockets where the Dark never fully wins.

## Aesthetic pillars (every choice serves these)
1. Aerial perspective / depth fog is the whole look.
2. Two color scripts: Bright = warm gold; Dark = teal/violet/aurora-green.
3. Big silhouettes, clean readability, awe of scale.
4. Everything drifts — wind, herds, aurora, ice, rivers.
5. Volumetric light everywhere.

## Architecture rules
- One **WorldClock** (`seasonPhase ∈ [0,1]`) drives EVERYTHING. Subscribe, don't duplicate.
- Terrain generation must express the lore (fjords, Weld, ice, vents), not generic noise.
- Prefer GPU instancing / compute for anything numerous (grass, herds).
- Keep it hot-reloadable and visually verifiable each milestone.
- Use `leva` for live-tuning; bake tuned values into `config.ts`/`palettes.ts`.

## Current milestone
<update this line as you go — start at Milestone 0>
```

---

## 10. First prompts to hand Claude Code

Paste these in order, one session each. Verify the visual before moving on.

**Milestone 0**
> Read CLAUDE.md and KETU-9-GAME-PLAN.md. Scaffold the Vite + React + TypeScript project with react-three-fiber using the WebGPU renderer (WebGL2 fallback). Set up the folder structure from §4. Render an orbiting camera around a gray sphere placeholder so I can confirm the pipeline runs and hot-reloads.

**Milestone 1**
> Implement the atmosphere: a Rayleigh + Mie single-scattering sky dome in `sky/Atmosphere.tsx` + `scatter.glsl`, and apply aerial-perspective fog to the scene so distant geometry dissolves into the sky color by depth. Expose sun direction and scattering coefficients via Leva. Goal: an empty but gorgeous horizon.

**Milestone 2**
> Build `world/WorldClock.ts` as a Zustand store exposing `seasonPhase ∈ [0,1]`, with auto-advance (~25 min/year) and manual scrub. Drive the sun along a high-tilt spiral path from it, and crossfade a Bright→Dark color grade. Wire atmosphere tint to the phase (warm in Bright, cold in Dark). I should be able to scrub the year and watch the mood change.

Then continue down the §8 table, one milestone per session, updating the "Current milestone" line in CLAUDE.md each time.

---

## 11. Scope discipline (read before you get ambitious)

**In the slice:** one planet, one region rendered beautifully, the full Bright/Dark cycle, 4–5 fauna types, traverse + scan. **Not in the slice:** space flight, multiple planets, base building, combat, multiplayer, inventory economies. Those are the *sequel*. The slice's job is to make one person stop and say *"where is this."* If Milestone 8 does that, the plan worked.

**Perf budget:** target 60 fps at 1080p on a mid laptop. Instancing and LOD are not optional. Profile at Milestone 5 and again at 9.
