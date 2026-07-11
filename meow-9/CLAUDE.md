# Meow-9 — project context

We are building **MEOW-9: The Drift** — an orbital cat-sanctuary toy in
React Three Fiber + Three.js, TypeScript, Vite. Sibling project to `../ketu-9`
(same stack, same architecture rules). Not a game with goals: one gorgeous
room, one dial, sixteen adorable black cats.

## The station (canon — respect this)
- One hab module of an orbital cat sanctuary: neon-lit decks, panel-grid
  walls, a porthole onto a violet/teal nebula that doesn't care.
- Everything is an adorable BLACK CAT: glossy-black primitive-built bodies,
  big glowing eyes (gold, every third cat green), cone ears, four-segment
  tails. No external assets — everything is code-generated.
- The hero mechanic is the **Gravity Dial**: 1g cats loaf/strut/groom;
  scrub down and the room lets go — props lift, neon rises, cats tumble and
  air-paddle. Cats always land on their feet when the dial comes back.
- Secondary: the **laser pointer** (LASER pill arms it; drag paints the dot).
  Grounded cats chase and pounce (crouch → butt-wiggle → leap); drifting cats
  paddle toward it and push off walls.
- Contact is REAL: cats resolve against furniture, each other, and the toys.
  `station/colliders.ts` holds the furniture circle colliders + the
  SCRATCH_POSTS registry; a trotting cat bats a toy (full ballistics, floor
  restitution, rolling friction — it stays where it rolls), balls collide
  with each other, and cats have a `scratch` mode (walk to a sisal post,
  rise on hind legs, alternating strokes) cueable by the Observer.
- The two hero cats wear collars (spec.collar "A" gold tag / "B" blue) —
  they're modelled on the real girls. Whiskers + slit pupils on everyone.
- The station is CREWED — by cats. Five uniformed professionals in
  role-colored service harnesses hold roster slots 2–6 (inside the touch
  cut): Cmdr. BAST at the command console under the porthole, KEPLER the
  spin engineer (her wall gauge's needle IS the Gravity Dial, diegetically),
  MISO in the med bay, STATIC on comms, CLOVER in hydroponics (glowing
  catnip rack). `station/crew.ts` is the registry — names, harness colors,
  duty posts — and its ZONES table is the single source for console
  footprints (colliders.ts derives the furniture circles from it). Crew
  cats roll a `duty` mode between naps: walk to post → sit tall → paw-tap
  bursts + telemetry head-sweeps. A duty cue exists for the director.
  The girls (slots 0/1) wear no uniform: they own the place.
- Signage is canvas-drawn (`fx/labels.ts`, still no external assets): the
  MEOW-9 plaque over the porthole, the duty roster board, a label per
  section, crate stencils. Painted-light MeshBasicMaterial, under bloom.
- Cats keep PERSONAL SPACE: walk targets, scratch posts, and settle-downs
  are crowd-scored (`crowdAt` in Cat.tsx) — a cat never settles where two
  sisters already are, and busy posts cost extra walk — so the roster
  spreads across the hab instead of piling around the cat tree.

## Architecture rules
- One **GravityDial** (`src/world/GravityDial.ts`, `g ∈ [0,1]`) drives
  EVERYTHING. Hot paths read `getState()` inside `useFrame`; UI subscribes
  narrowly. Never store "how heavy the world is" anywhere else.
- Cats are articulated `<group>`s of primitives (Glassbears pattern from
  ketu-9), NOT InstancedMesh — geometry + materials shared via `Cats.tsx`.
  FSM state lives in a `useRef`; all behavior timing on the integrated
  clamped-dt clock (`s.time += min(dt, 0.1)`), never raw elapsedTime
  (elapsedTime for cosmetic sways only).
- `cats/fsm.ts` timelines (POUNCE, GROOM_TOTAL) are the CONTRACT between the
  cats and the Observer director — shots do timing math against them.
- `cats/direction.ts` is the cue bus + track-point registry
  (`cat0`, `cat0Head`, computed `driftCat`).
- Props (`station/Props.tsx`) are the one place instancing IS right:
  numerous, identical, no articulation.
- Bloom threshold is 1.05 — only deliberate HDR sources ignite (neon strips,
  cat eyes, laser dot). Keep everything else under 1.0.
- Keep expensive things behind `IS_TOUCH` (`world/device.ts`): DPR, cat
  count, composer (desktop-only), shadow map size, nebula FBM octaves,
  physical-vs-standard cat material.
- Use `leva` for live-tuning; bake tuned values back into `config.ts` /
  `palettes.ts`.

## Renderer note
Never enable `logarithmicDepthBuffer` — three.js doesn't patch raw
ShaderMaterials (nebula, holo panels) for log depth, which silently hides
them (cost ketu-9 a debugging hour).

## Hosting + mobile
Deployed at builtbyshrey.com/meow-9/ — the portfolio's Pages workflow builds
this project (`base: /meow-9/`) and copies its dist into the site artifact;
the Playground page + footer link to it. Touch profile: capped DPR, 10 cats,
no composer, collapsed Leva.

## Dev handles
`__meowGravity` (setG/setRunning), `__meowObserver` (`jumpTo(i)`),
`__meowDirector` (`direct({kind:"pounce"|"groom"|"scratch"|"duty",index:0})`),
`__meowTrack` (`point(key)` / `yaw(key)` / `bodies` — live track registry).
