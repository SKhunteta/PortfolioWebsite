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

## Hosting + mobile
Deployed at builtbyshrey.com/ketu-9/ — the portfolio's Pages workflow builds this
project (`base: /ketu-9/`) and copies its dist into the site artifact; the
Playground page links to it. Touch devices get a lighter profile in `App.tsx`
(`IS_TOUCH`): capped DPR, reduced atmosphere march steps (shader defines), and a
collapsed Leva panel. Keep new expensive effects behind the same switch.

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

## Observer Mode (added out-of-band, after M3; cinematic overhaul after that)
`src/observer/ObserverMode.tsx` — one button (◉ OBSERVE), a looping cinematic
director, now 11 shots (Bright → falls/mirehorns → breach → bears → sunset
timelapse → aurora Dark → wolf howl, then loops back to Bright). Shots support
FOV zoom (`fovFrom/fovTo`, restored on exit), live creature `anchor`/`lookAnchor`
offsets (track points from `life/direction.ts`; NOTE `look` adds to the
lookAnchor point — aim offsets are relative to the HEAD, not the ground),
handheld `shake`, `dof` hints (drives `fx/PostFX.tsx`),
hard `cutIn/cutOut`, and performance `cue`s — the director COMMANDS a bear
roar / leviathan breach / mirehorn drink / wolf howl at an exact shot offset
via the direction bus, using the ROAR/BREACH/DRINK/HOWL timelines in
`life/direction.ts` (the choreography contract).
It drives the season ONLY via WorldClock setPhase (like the scrub slider) and
restores camera+clock+FOV on exit. A ⏩ speed button (also the `.`/`>` key)
cycles the tour's playback rate through `OBSERVER_SPEEDS` (1×/2×/4×) by scaling
the director's `dt`, so shots, cues, phase glide and fades all fast-forward
together. Camera safety: authored FOVs are widened on portrait aspects
(`compensateFov` — three.js FOV is vertical; without this a phone crops
close-ups to a keyhole), the lens is clamped above the analytic heightfield,
and anchored shots hunt a `frameYaw` at shot start (rotating the whole offset
around the subject until both dolly endpoints clear the terrain — creatures
stop on slopes). Fauna: `life/Glassbears.tsx` (articulated
anatomy + roar FSM, transmission shimmer; on touch the fake-glass material
needs `depthWrite: true` or the overlapping spheres stack into an opaque
balloon), `life/Leviathans.tsx` (deep-cruise +
cued breach FSM, photophores), `life/SkyEagles.tsx` (M9-ish),
`life/Mirehorns.tsx` (moose-analog waders at the tour waterfall's plunge pool;
deterministic mount-time scan for BELLY-DEEP spots — the LOD mesh deviates
±1–2 m from the analytic heightfield, so ankle-deep water renders as dry
seabed — plus a per-heading wading-radius profile so they never climb the
bank; antler velvet glows teal in the Dark),
`life/LanternWolves.tsx` (canon Dark-only pack on the bench near the bears:
photophore rows + halo sprites so they read as moving fires at range, howl FSM
with a pack chorus driven BY the leader's howl — so it fires during tours —
whole group un-renders in the Bright), `sky/Aurora.tsx` (three serpentine
shader curtains; opacity ∝ (1-dayness)²; with AdditiveBlending don't
pre-multiply rgb by alpha — it dims quadratically), plus an aurora-green
skylight floor on the Dark hemisphere light in `App.tsx` (canon: the Dark is
aurora-lit, not void-black),
`water/Waterfalls.tsx`, `water/Ocean.tsx` (Gerstner grid + skirt, raw GLSL;
on touch there is NO grid so the skirt must sit at y=0 — at its usual −3 m
every shoreline strands on dry seabed),
`fx/particles.tsx` (pooled ballistic bursts: splash/spray/vapor),
`fx/PostFX.tsx` (SMAA+Bloom+DoF+Vignette, desktop only — Bloom threshold >1 so
only HDR sources ignite), `world/locations.ts` (POIs found by offline
heightfield scans — re-scan if the geology changes). Dev handles: `__ketuClock`,
`__ketuObserver` (`jumpTo(i)`), `__ketuDirector` (`direct({kind,index})`),
`__ketuFX` (`emitBurst`), `__ketuTracks` (`get/yaw` of live track points),
`__ketuCam` (the live camera). Headless/CI note: under SwiftShader the frame
clamp (dt ≤ 0.1) runs the tour ~3× slower than wall time — cue timings are
correct on real hardware.
**Warning:** do NOT enable `logarithmicDepthBuffer` — three.js doesn't patch raw
ShaderMaterials for log depth, which silently hides them (cost a debugging hour).
