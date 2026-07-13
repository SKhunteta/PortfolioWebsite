# Link-Map — project context

We are building **The Link, Alive** — a real-time generative-art map of
Seattle's Link light rail in React Three Fiber + Three.js, TypeScript, Vite.
Sibling project to `../meow-9` and `../ketu-9` (same stack, same architecture
rules). Not a transit app: an aquarium piece that happens to be true. Neon
circuit diagram of the city at night, almost dreamlike — someone leaves it
on a second monitor and the city breathes at them.

## The piece (canon — respect this)

- The city itself is a **storybook watercolor** (the Dreambeans register):
  real OSM geography — Puget Sound with its islands, Lake Washington with
  Mercer Island, parks as soft under-washes, major streets as hand-inked
  strokes (faint gold filaments at night, pale ink by day) — painted
  in-shader over paper grain, shorelines breathing ~30 m on world-space
  noise. Baked by `scripts/build-link-basemap.mjs` (repo root) into
  `src/data/basemap.json`; data © OpenStreetMap (ODbL) and the HUD credits
  it whenever it's on screen. The hand-authored `map/waterData.ts` rings
  are the permanent fallback when the file is the placeholder stub.
- Every train is a **toy S700** — a code-built, three-section articulated
  Link LRV that bends along the real curve, each section aligned to its own
  chord, in real S700 proportions (slim: width 0.10·L, height 0.13·L). The
  livery is the actual identity kit, painted on a shared canvas texture:
  navy roofline and nose cap, big glass band, teal-over-green double wave
  on a navy skirt, ST bumper mark, amber destination sign. Lit windows stay
  under the bloom line; an HDR headlight leads and the trailing cab shows
  red taillights (per-instance aLead; face regions classify by LOCAL
  normal — world normals rotate with heading and once swapped the sides
  onto the nose). The model IS the
  position marker at every zoom: storybook-large at drift distance, easing
  toward real scale as the camera closes (`modelL`, per train). Its glow
  halo and speed-proportional trail stay underneath.
- Trains glide, NEVER teleport: position is arc-length `s` on the shape,
  rate-chased toward each poll target (`trains/tween.ts` is the contract);
  the trail is a fixed time-window position history, so length ∝ speed by
  construction.
- Stations are quiet orbs that **pulse on dwell** (train within ~120 m of
  their arc mark), swelling on the global breath. Names appear only on
  hover/tap, uppercase monospace, canvas-drawn (`stations/Labels.tsx`) —
  no external font fetches, ever.
- The background city is hand-inked (`map/Landmarks.tsx`, ONE merged
  geometry): downtown's massed towers and the Needle, Bellevue's second
  skyline for the 2 Line, the stadiums, the port's raked gantry cranes, the
  Great Wheel, Gas Works, the Spheres, Husky Stadium — and, ghosted at REAL
  scale on the horizons, Rainier southeast and the Olympics west. On the
  Sound, two toy WSF ferries trade the Bainbridge crossing and the water
  taxi darts to Seacrest (`map/Ferries.tsx`, one InstancedMesh) — ambient
  paint like Rainier, NOT data: real routes at real crossing speeds,
  deterministic from the scene clock, never presented as live.
- The map stays a flattened diagram — no tiles, no labels beyond stations.
  **Tunnels render below the translucent paper and are seen through it** —
  that submerged dimness is painter's order, not depth trickery (the order
  table lives in `map/GroundPlane.tsx`). Elevated segments ride high and
  slightly brighter. Grade data is an artistic annotation
  (`scripts/data/link-grade-annotations.json` at the repo root); GTFS
  carries none. Parks render UNDER the paper so the same trick dims them
  into washes.
- **Honesty is part of the art**: the corner badge says live / simulated /
  resting, and it never lies. Live = fresh GTFS-RT. Simulated = service is
  scheduled but the feed is unavailable, so the backend synthesizes
  deterministic trains from the real timetable. Resting = the network
  sleeps (3 am), and an empty map is the truth.
- Day/night keys to the actual sun over Seattle (`world/sun.ts`, suncalc):
  night is the hero look; day is the same city gone cool and pale — never
  white, or the additive light dies. `?phase=night|dusk|day|0..1` pins it.
- Camera moods (`observer/CameraRig.tsx`): ambient drift by default (slow
  orbit + seeded simplex sway + breath), drag to orbit (drift resumes after
  30 s), double-tap/double-click a train for chase view. Escape/drag lets go.

## Architecture rules

- **One clock** (`world/clock.ts`): integrated clamped-dt
  (`t += min(dt, 0.1)`) plus the global ~9 s breath. Trains.tsx's useFrame
  is the single driver — it ticks the clock, lerps the palette, advances
  every train. Nothing else advances time.
- **Hot paths never touch React.** `trains/store.ts` splits state: TRAINS
  is a plain Map read inside useFrame; the zustand `useUi` store carries
  only what React renders (badge mode, hover, chase target).
- **Palette-by-reference** (`world/palettes.ts`): materials hold the LIVE
  palette's THREE.Color instances; `updatePalette(phase)` lerps into them
  once per frame and every shader follows. Don't clone palette colors into
  materials.
- Data contract: `src/data/network.json` is BAKED by
  `scripts/build-link-network.mjs` (repo root) from Sound Transit's GTFS —
  re-run it (or dispatch `.github/workflows/refresh-link-data.yml`) when
  the network changes. Frontend and backend agree on the projection through
  the file's `meta.projection`; never hardcode projection constants.
- The backend simulator is **deterministic from wall clock** — consecutive
  polls see the same train ids gliding forward. The tween depends on this;
  don't add randomness server-side.
- Everything scene-side is transparent + `depthWrite: false` and ordered by
  `renderOrder` (0 parks → 11 labels; full table in `map/GroundPlane.tsx`),
  with ONE exception: the train-model materials write depth (renderOrder 9)
  so the three sections self-occlude. Breaking the ordering shatters the
  tunnel-through-ground illusion.
- Raw ShaderMaterials do NOT get scene fog: any normal-blended layer must
  mix toward `LIVE.fog` itself and additive layers must MULTIPLY by the fog
  factor (`map/watercolorGlsl.ts` has the helpers), or the horizon breaks
  at drift distance.
- NEVER use useFrame priorities — R3F v8 disables auto-render when any
  priority > 0 exists. Trains.tsx's zero-priority useFrame is the single
  driver; TrainModel receives its transforms through the imperative
  `TRAIN_MODEL.write/commit` registry, not its own frame loop.
- Instanced everything: glow sprites, station orbs, train cabs (×2/train),
  mid sections, headlights — and ONE preallocated buffer for all trails
  (drawRange trims), ONE merged geometry per road class, per water layer.
  Whole scene ≈ 22 draw calls on every tier. `frustumCulled = false` on
  instanced meshes — spread instances mis-cull.
- Toy scale is per-object and camera-relative (trains `modelL`, station
  orbs' `toyScale`): a chased train eases toward real scale while the
  background fleet stays storybook-sized. Don't introduce global scale
  factors.
- Keep expensive things behind `PROFILE` (`world/device.ts`): phone /
  tablet / desktop on two independent axes (TIER = budget, INPUT_TOUCH =
  ergonomics), `?tier=` override, iPadOS maxTouchPoints check. Composer
  off|lite|full lives THERE, never ad-hoc.
- Train cores are painted HDR (~2.6) in the sprite shader; the bloom
  threshold sits just above 1.0 so ONLY deliberate sources ignite. Phones
  (composer off) still look luminous because the glow is painted, not
  post-processed.
- FOV is aspect-compensated (`fovForAspect`) — baseFov values are authored
  at 16:9; portrait widens. Chase view narrows ~6°.
- Hidden tab: frameloop "never" + poller paused; on return, one immediate
  poll and the tween fast-forwards (>3 km gap lands short and glides in,
  trail ring cleared so no screen-crossing streak).
- Use `leva` (dev dependency) for live-tuning; bake into `world/config.ts`
  / `world/palettes.ts`.

## Renderer note

Never enable `logarithmicDepthBuffer` — three.js doesn't patch raw
ShaderMaterials (ribbons, trains, trails) for log depth, which silently
hides them (cost ketu-9 a debugging hour).

## Hosting + backend

Deployed at builtbyshrey.com/link-map/ — the portfolio's Pages workflow
builds this project (`base: /link-map/`) and copies its dist into the site
artifact; the Playground page + footer link to it. Data comes from
`/api/linkmap/vehicles` on portfolio-backend (Railway,
backend.builtbyshrey.com; localhost:3001 in dev) — 10 s poll matching the
backend's cache TTL, hostname-based base URL in `trains/poller.ts` (the
sub-app deliberately does NOT import the SPA's api config).

## Dev handles

`__linkMapStats` ({fps, mode, trains, tier}, refreshed 1 Hz),
`__linkMap` (`setPhase(0..1|null)`, `follow(index)`, `release()`).
`?debug` shows the HUD readout; `?tier=` forces a device tier;
`?phase=` pins the sun. `scripts/device-smoke.mjs` is the per-tier
regression harness (playwright-core, chromium at /opt/pw-browsers/chromium).
