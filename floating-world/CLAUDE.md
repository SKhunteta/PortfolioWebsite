# Floating-World — project context

We are building **The Floating World** — the ukiyo-e edition of
`../link-map` (The Living Link): the same real-time map of Seattle's Link
light rail in React Three Fiber + Three.js, TypeScript, Vite, repainted as
a Classical Japanese woodblock print in motion. Sibling project to
`../link-map`, `../meow-9` and `../ketu-9` (same stack, same architecture
rules). Not a transit app: a moving painting that happens to be true —
Hokusai's register over Hiroshige's hours, warm and bright, someone leaves
it on a second monitor and the print breathes at them.

## The piece (canon — respect this)

- **Day is the hero look**: warm washi cream, never white — the paper is
  the subject (grain up, and it drifts sub-perceptually so the sheet itself
  is alive). Night is a **warm lantern print** — aubergine dusk, lantern-gold
  streets, indigo water — never cool blue. Day/night still keys to the
  actual sun over Seattle (`world/sun.ts`, suncalc); `?phase=` pins it.
- The city is a **woodblock print**: real OSM geography — Puget Sound,
  Lake Washington, parks as warm moss washes, major streets as dry-brush
  **sumi ink strokes** (normal-blended pigment, NOT additive light; ink
  darkens paper). Water is **Prussian blue (ai)** woven with the seigaiha
  wave-fan pattern in foam-white linework — the Great Wave register, and a
  DAYTIME signature here (gold-thread by lantern light after dark).
  Shorelines pool blue pigment. Baked basemap/data contracts are identical
  to link-map (`scripts/build-link-basemap.mjs` at repo root →
  `src/data/basemap.json`; © OpenStreetMap, credited in the HUD).
- Every train is the same **toy S700** geometry, repainted for the print:
  sumi-ink roofline and nose cap, warm washi body, Prussian-over-vermilion
  double wave on an indigo skirt, wide ink seams — the ink outline is what
  keeps trains legible on bright paper. HDR cores still ignite bloom:
  lanterns in daylight. Line colors remap toward woodblock pigment
  (`lineGlow` darkens instead of lightening — 1 Line matcha, 2 Line
  Prussian: Hokusai's duo).
- Stations pulse on dwell as before, but their surface seals are
  **vermilion hanko stamps** — hero-opacity by day. Station identity data
  (`src/data/station-identity.json`) is researched real-world color; never
  restyle the data, only how the palette mixes it. The eight **underground
  halls** are fleshed out below the paper (`stations/UndergroundLife.tsx`,
  renderOrder 3): a backlit deep-platform crowd that gathers on the honest
  dwell pulse, and a per-station **art fresco** painting each hall's real
  signature artwork procedurally (`stations/motifs.ts` +
  `stations/motifsGlsl.ts` — Beacon Hill's sea-forms, Capitol Hill's kissing
  jets, UW's geologic glyphs, Symphony's cave-glyphs, Westlake's terra-cotta
  vines, Pioneer Square's clocks, Roosevelt's gold ziggurat, U District's
  light tubes), flaring into bloom on a train's arrival. The motif descriptor
  (which shader, which second pigment) is a rendering choice kept OUT of the
  researched identity JSON. Underground CLASSIFICATION is the researched
  `structure` field, never the eased rail height (portal-boundary stations
  land mid-ramp: SODO is at-grade, Beacon Hill is the deepest hall) — and
  every hall floor sits at the canonical tunnel depth. Each hall is a ROOM
  (`stations/HallShells.tsx`, renderOrder 2.9): a warm floor wash and an
  accent-lamplit ring wall that turn up while dived into (lighting the room
  is scenery; the crowd stays train-honest), the bored tunnels run between
  lamplit trench walls (`map/TunnelWalls.tsx`, 2.8), and the town fades to a
  ghost inside a dived hall's footprint (`map/Buildings.tsx` uDive skylight)
  so downtown's towers never bury the artwork.
- Rainier ghosts the horizon at real scale with **Fuji's warm-white snow
  cap**; **Mount Baker** answers it on the northern horizon as a cooler second
  Fuji (its own `aBaker` vertex flag drives the bold cap + sumi keyline, but
  none of Rainier's dawn vermilion), with **Glacier Peak and the Cascade
  crest** closing the eastern wall — Rainier SE, Cascades E/N, Olympics W.
  Ferries, floatplanes, stadium nights, the Needle beacon — all the
  deterministic ambient life carries over unchanged.
- **Ferry deck life** (`map/FerryDeck.tsx`): a strict CLOSE-ZOOM reveal that
  turns the toy WSF boats from tokens into vessels. Zoom the camera in on a
  ferry mid-crossing and the deck populates — a handful of warm passenger dabs
  stand along the promenade rail (one is ALWAYS at the bow, watching the
  crossing), and on cold days each puffs a little breath into the air. One car
  deck below shows as a file of parked-car rectangles in muted woodblock hues —
  but only on the **car ferries**: the West Seattle water taxi carries no cars,
  so its deck stays bare (honest, like everything here). Two instanced draw
  calls (billboard passengers with the breath carved into the same fragment
  shader; flat oriented car rectangles), posed each frame from the SAME
  `ferryPoseAt()` the hulls and wakes read, so the deck can never drift free of
  its boat. Pure LOD: each vessel reveals on its OWN camera distance
  (`config.ferryDeck`), and the whole layer HIDES ITSELF ENTIRELY at the
  ordinary drift distance (both meshes `visible = false`, zero draw cost) — the
  gated-critter rule. The breath is keyed to a real, eased **coldness** signal
  (`world/weather.ts` `COLD`, an honest air-temperature read that ramps ~10 °C →
  ~1 °C, floored by snow); `?cold=0..1|on|off` / `__linkMap.setCold()` pins it.
- **Airliners** (`map/Airliners.tsx`, one InstancedMesh): a toy SeaTac fleet,
  half Delta half Alaska (the livery is a baked canvas atlas — wordmark + tail
  device — with a per-instance `aAirline` flag sliding each jet onto its half,
  so the split is structural). Two opposed touch-and-go circuits (34R north
  flow east over the valley, 16C south flow west over the Sound) plus one of
  each parked at the gates — ambient like the ferries, deterministic from the
  clock, never live. Unlike the daylight-VFR floatplanes they hold through the
  night (the palette only dims them). Livery whites are clamped below the
  bright-paper bloom line in the shader.
- More real Seattle geography woven into `map/Landmarks.tsx` (one merged
  geometry): **Pike Place Market**, **Boeing Field / the Museum of Flight**,
  the **city of bridges** (the I-90 and SR-520 floating spans the trains and
  highways ride across Lake Washington, plus the ship-canal drawbridges), the
  **Ballard Locks** where the canal meets the Sound, and the **far-shore
  islands** the ferries sail to (Bainbridge, Vashon, Blake). Plus the named
  silhouettes: **Smith Tower** wearing its pyramid cap, **King Street
  Station**'s campanile beside the tracks, the **Fremont Troll** (VW Beetle in
  hand) under the Aurora Bridge's north end, the **Pacific Science Center**
  arches by the Needle, and **Volunteer Park**'s brick water tower and
  conservatory glasshouse up the hill from Capitol Hill Station. The **seven
  hills** are a stylized sum-of-gaussians hillshade in the ground shader
  (`map/GroundPlane.tsx`) — relief, not geometry — and **shore lighthouses**
  (West Point, Alki, Mukilteo) flash over the Sound from `map/CityLights.tsx`.
- **The lighthouse's slow sentence** (`map/LighthouseBeams.tsx`): after dark,
  West Point and Alki Point sweep real-cadence rotating beams over the Sound —
  West Point its real alternating white/red panel pair (one rotation per 10 s,
  a flash every 5 s alternating colour), Alki a single white beam on its real
  5 s flash; cadence is read from the CityLights entries so lantern and beam
  keep the same time. Where a beam crosses the water it briefly reveals what
  the night hides — a seigaiha wave crest, a seal's sumi head, once in a rare
  while a pair of orca fins — a rolling ~1 s spotlight (fade-out a touch
  longer than fade-in) over a deterministic hashed set of hidden things that
  re-seeds every few minutes, placed only in authored open-water sectors. Two
  draw calls (additive fog-multiplied beam wedges under the bloom line +
  normal-blended reveal sprites), hidden entirely by day like the gated
  critters; one quiet caption the first time a sweep finds the fins.
  `?beams=on|off` pins or clears the sweeps.
- **Sakura** (`map/Sakura.tsx`, one instanced draw call): cherry-blossom
  canopies clustered at the real bloom sites (UW Quad, the Arboretum, Green
  Lake, Seward Park). SEASONAL and honest — keyed to `world/bloom.ts` (up in
  mid-March, full late March, gone by mid-April, nothing the rest of the
  year), the same honesty rule the birds and seaplanes keep. `?bloom=` pins it.
- **Kasumi** (`map/Kasumi.tsx`, one draw call): the classic horizontal mist
  bands of ukiyo-e drift slowly across the middle distance, colored
  `LIVE.fog` with a thin gilt (kinkumo) edge. They yield to REAL fog
  (honesty rule: stylized mist never impersonates weather) and thin at
  night.
- **The crow commute** (`map/Crows.tsx`, one instanced draw call): Seattle's
  real evening river of crows streaming northeast to the Bothell roost, and
  scattering back over the city at dawn. Unlike the gulls' symmetric
  golden-hours gate this one is DIRECTIONAL — the sun's trajectory decides
  which way the stream flows (roost-bound as it falls, city-bound as it
  rises) — and the marks are true sumi crows, darker and floppier than the
  gulls' shallow chevrons. Hidden at midday and deep night (the mesh costs
  nothing off-gate). `?crows=off` clears the sky.
- **Seafair weekend** (`map/Seafair.tsx`, gated by `world/seafair.ts`): the
  first weekend of August, show hours only — three hydroplanes drag seigaiha
  roostertails around the Stan Sayres log-boom course while the Blue Angels'
  six-ship delta banks a low show line over Lake Washington, with one quiet
  caption as the first heat comes up. A CALENDAR estimate at bloom.ts's
  honesty tier, deterministic from the wall clock like the stadium nights —
  the other 51 weekends the lake is bare: absence, not invention.
  `?seafair=on|off` pins it.
- **The canoe crossing** (`map/Canoe.tsx`, gated by `world/journeys.ts`): a
  single high-prowed Coast Salish cedar canoe pulls the long crossing of
  Elliott Bay — the Duwamish mouth to the landing beach at Alki — through
  the summer Canoe Journeys season, daylight-only on the crew shells' own
  crossfade. Treatment is deliberately restrained: a pure sumi silhouette
  with a file of paddler ink dabs, NO invented regalia or specific tribal
  design — a respectful mark in the print's own language. The rail is only
  the newest transit on this water, and the print says so.
  `?canoe=peak|none` pins the season.
- **Jimothy** (`map/Jimothy.tsx`, one instanced draw call): the round raccoon
  of Ballard — a real short-spined raccoon who went viral in July 2026 after
  he was filmed one evening by the Ballard Goodwill. A tasteful Easter egg at
  the crow commute's honesty tier: one pure sumi silhouette (the round
  fuzzy-ball body that made him famous, a small tucked head, bunched stub legs,
  a short bushy ringtail hugging close behind) trotting a small deterministic
  block-loop by the Locks, with two rummage stops at his own little sumi
  garbage cans (a second instanced draw call — two standing at the curb side
  clear of his trot line, he pivots to nose in; one knocked over; alley
  furniture on stage all day, palette- and fog-bound). His coat is true
  grizzled raccoon-gray (FRAG_FUR: pale flanks, sooty legs, bandit mask,
  banded tail) mixed with a whisper of the palette ink; he and the cans are
  solid pigment — they write depth (the train-model exception) so the parts
  self-occlude
  ("very spry"). Canoe-tier restraint, storybook-tiny, NORMAL-blended ink on
  `LIVE.landmark`, renderOrder 6. Gated crepuscular on the crows' twilight
  band — the hours a raccoon keeps and the hour he was seen — hidden entirely
  (zero cost) at midday and deep night; observe mode sweeps him for free. One
  quiet HUD caption on first sighting. `?jimothy=on|off` pins him (on lifts
  the gate to any phase); `__linkMap.jimothy(true|false|null)` from the
  console.
- **The Gum Wall pilgrimage** (`map/GumWall.tsx` + `world/gumwall.ts`): Post
  Alley under Pike Place Market, where the real wall has taken a piece of gum
  from nearly every visitor since 1993 (steam-cleaned back to brick in 2015 —
  94 buckets, 2,350 lb — and begun again within days). Once per visit a lone
  straw-hatted pilgrim (Heroes' billboard figure language) walks the alley,
  pauses at the brick, and presses in ONE dot of saturated pigment drawn at
  random from that day's four-pigment tray (date-seeded from a fixed set of
  eight woodblock hues, all under the bloom ceiling). The dots persist in
  **localStorage**, so each returning viewer's copy of the print ages
  uniquely — a woodblock that wears with every impression pulled; at
  `WALL_CAPACITY` the wall is honestly steam-cleaned and begins again, with a
  caption for both beats. Three cheap draw calls: the brick wall (one box,
  sumi-brick wash, depth-writing like the cans), ONE preallocated
  InstancedMesh of pressed dots (count-trimmed, the print's only confetti),
  and the pilgrim plane (hidden — zero cost — outside the walk). The
  Landmarks merge gained the Economy Market / Market Theater block so the
  alley reads as a cut between masses. Pure logic (day palette, storage
  round-trip, capacity rule) is node-safe and vitest-covered
  (`world/__tests__/gumwall.test.ts`). `?gumwall=on` loops the pilgrim for
  demos, `off` stills the alley (the accumulated dots always stay);
  `__linkMap.gumwall()` / `gumwallState()` from the console.
- **Sidewalk chalk half-life** (`map/Chalk.tsx` + `world/chalk.ts`): on a dry
  summer weekend a small patch of colored chalk scribbles appears on a park
  path — procedural and childlike (a scribbled spiral, a lopsided sun, a
  zigzag, a hopscotch, a wavy rainbow), drawn from that weekend's dusty pastel
  tray. The whole drawing is seeded from the weekend id (Saturday and its
  Sunday share one id, so the two days carry the same marks; two tabs and a
  reload agree), never Math.random. Only SOME summer weekends draw — a
  deterministic per-weekend gate, absence not invention, the Seafair honesty
  tier — and the park path rotates among real kid-friendly spots (Green Lake,
  Gas Works, Cal Anderson, Volunteer Park, Seward, Alki). Each rain ERASES it:
  the wash tracks the real `WEATHER.rain` and is MONOTONIC within a weekend, so
  once a shower has crossed the path the chalk stays gone even after the sky
  dries — the print's most fragile mark. It fades toward dusk (a daytime kid
  thing) and is NOT persisted: impermanence at kid scale, nothing to
  accumulate, only to lose. ONE draw call — every stroke merged into a single
  ribbon geometry (the road/shoreline strip builder) with a per-vertex pastel,
  a chalk shader breaking the coverage up with the pavement tooth and
  dissolving it as the wash rises; normal-blended on the fog contract,
  renderOrder 5.2, storybook-tiny and hidden (zero cost) whenever it's not on
  stage. Pure logic (calendar, weekend id, tray, gate, scribbles) is node-safe
  and vitest-covered (`world/__tests__/chalk.test.ts`). `?chalk=on` forces a
  patch onto a path off-season for demos, `off` clears it;
  `__linkMap.chalk()` / `chalkState()` from the console.
- **The 1962 Monorail** (`map/Monorail.tsx`): the World's Fair Alweg trains
  shuttling their 0.9-mile beamway up Fifth Avenue between Westlake and
  Seattle Center — always exactly the two two-car trains, the Red one and the
  Blue one, each on its own parallel beam, counter-phased with a dwell at each
  terminal. Ambient paint at the T Line's honesty tier (deterministic from the
  clock, never presented as live), drawn deliberately more CARTOONISH than the
  Link fleet — a slight bob and nose-nod while under way, stilled at the
  platforms — an older print pasted into a newer one, given the affection of a
  family elder: it has run this route since 1962. Liveries are painted from
  the real trains (cream + red roofline/bullet nose/belt over the fluted
  corrugated-aluminum skirt; deep Alweg blue under a pale roof cap with a
  sky-blue belt and the wraparound windshield). Three draw calls: the elevated
  beam strip, one merged pylon colonnade, and ONE InstancedMesh for both
  trains with a per-instance `aTrain` flag selecting the livery in the shader
  (the red/blue split is structural, like the airliners' Delta/Alaska halves).
- **SkyBokashi** (`fx/SkyBokashi.tsx`, one screen-space quad, renderOrder
  −1): the hand-wiped gradient at the top of every print — transparent into
  Prussian blue by day, deep plum by night, faint baren streaking. Exempt
  from scene fog like the weather hatch.
- Real Seattle weather still paints the page (`world/weather.ts`,
  Open-Meteo): rain darkens the washes (wet paper), fog is pale kasumi
  (never slate), snow dusts warm-pale. Rain also stamps **raindrop rings** —
  sparse foam circles swelling over the water pigment (`map/Water.tsx`, in
  the seigaiha's own foam line) — and the overlay's hatch slant is **wind**,
  meandering through gusts off the shared clock. A real **storm strikes
  lightning** (the Sanka Hakuu move): deterministic hash-scheduled strikes
  flash the sheet pale — never past the bright-paper ceiling — and carve a
  vermilion-gold bolt in a sumi halo (`fx/WeatherOverlay.tsx`), while the
  room tone rolls thunder in a few seconds behind the light
  (`audio/engine.ts`). Honesty rule unchanged: the weather word speaks only
  after a real fetch; never invent weather.
  `?weather=clear|cloudy|fog|drizzle|rain|storm|snow` pins it.
- Tunnels below the translucent paper, honesty badge (live / simulated /
  resting), gliding tween contract, camera moods — all identical to
  link-map's canon; see `../link-map/CLAUDE.md` for the long-form
  descriptions. Functionality is the SAME piece; only the paint changed.
- HUD chrome is **ink on paper**: system serif for the title and panel
  prose (no external font fetches, ever), mono stays for ETAs; warm paper
  halo instead of dark text-shadows; badge dots vermilion (live) / gold
  (simulated) / dry-earth (resting).

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
- **Bright-paper bloom rule** (this edition's inversion of link-map's OLED
  rule): every palette value stays under ~#f2 per channel and the bloom
  threshold sits at 1.0 with tight smoothing, so the washi NEVER catches
  the bloom skirt — only painted-HDR sources (train cores, headlights, the
  Needle beacon) ignite. And ink layers are normal-blended: additive
  strokes die on a bright base.
- Data contract: `src/data/network.json` is BAKED by
  `scripts/build-link-network.mjs` (repo root) from Sound Transit's GTFS —
  re-run it (or dispatch `.github/workflows/refresh-link-data.yml`) when
  the network changes. Frontend and backend agree on the projection through
  the file's `meta.projection`; never hardcode projection constants.
- The backend simulator is **deterministic from wall clock** — consecutive
  polls see the same train ids gliding forward. The tween depends on this;
  don't add randomness server-side.
- Everything scene-side is transparent + `depthWrite: false` and ordered by
  `renderOrder` (0 parks → 11 labels; full table in `map/GroundPlane.tsx`;
  Kasumi slots at 6.5, SkyBokashi at −1), with THREE exceptions: the
  train-model materials write depth (renderOrder 9) so the three sections
  self-occlude, Jimothy + his garbage cans write depth (renderOrder 6), and
  the merged landmarks write depth (renderOrder 6) — all for the same reason:
  multi-part solid bodies must self-occlude, or their parts (train sections,
  raccoon limbs, the Space Needle and downtown towers) bleed through each
  other in raw buffer order and read as glassy. Atmospheric distance on the
  landmarks (ghosted Olympics, far shores) is a color mix toward fog, not
  alpha, so it survives the opaque depth pass. Breaking the ordering shatters
  the tunnel-through-paper illusion.
- Raw ShaderMaterials do NOT get scene fog: any normal-blended layer must
  mix toward `LIVE.fog` itself and additive layers must MULTIPLY by the fog
  factor (`map/watercolorGlsl.ts` has the helpers), or the horizon breaks
  at drift distance.
- NEVER use useFrame priorities — R3F v8 disables auto-render when any
  priority > 0 exists. Trains.tsx's zero-priority useFrame is the single
  driver; TrainModel receives its transforms through the imperative
  `TRAIN_MODEL.write/commit` registry, not its own frame loop.
- Instanced everything: glow sprites, station orbs (two buckets: surface at
  renderOrder 7, submerged at 3), station seals, underground light shafts,
  ferries, train cabs (×2/train), mid sections, headlights — and ONE
  preallocated buffer for all trails (drawRange trims), ONE merged geometry
  per road class, per water layer, ONE for landmarks, plus the two submerged
  underground layers (deep-platform crowd + art frescoes, UndergroundLife.tsx).
  Whole scene ≈ 30 draw calls on every tier (link-map's ~25 + Kasumi +
  SkyBokashi + the two underground layers + the crow commute); the seasonal
  meshes (the canoe, Seafair's hydros and delta) and the gated critters (the
  crow commute, Jimothy at twilight, the lighthouse beams + their reveals
  after dark) hide themselves entirely when off stage instead of counting
  against every frame.
  `frustumCulled = false` on instanced meshes — spread instances mis-cull.
- Toy scale is per-object and camera-relative (trains `modelL`, station
  orbs' `toyScale`): a chased train eases toward real scale while the
  background fleet stays storybook-sized. Don't introduce global scale
  factors.
- Keep expensive things behind `PROFILE` (`world/device.ts`): phone /
  tablet / desktop on two independent axes (TIER = budget, INPUT_TOUCH =
  ergonomics), `?tier=` override, iPadOS maxTouchPoints check. Composer
  off|lite|full lives THERE, never ad-hoc.
- Train cores are painted HDR (~2.6) in the sprite shader; the bloom
  threshold sits at 1.0 so ONLY deliberate sources ignite. Phones
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

Deployed at builtbyshrey.com/sound-and-rail/ — the portfolio's Pages
workflow builds this project (`base: /sound-and-rail/`) and copies its dist
into the site artifact; the Playground page + footer link to it. The old
/floating-world/ path still resolves via a redirect stub the workflow writes. Data comes
from `/api/linkmap/vehicles` on portfolio-backend (Railway,
backend.builtbyshrey.com; localhost:3001 in dev) — the SAME endpoint and
cache link-map polls (10 s poll matching the backend's cache TTL,
hostname-based base URL in `trains/poller.ts`; the sub-app deliberately
does NOT import the SPA's api config). Never fork the poller or the data
files: both editions must agree on the network contract.

## Dev handles

`__linkMapStats` ({fps, mode, trains, tier}, refreshed 1 Hz),
`__linkMap` (`setPhase(0..1|null)`, `setWeather(kind|null)`,
`setTide(level|null)`, `setBloom(0..1|null)`,
`follow(index)`, `release()`, `observe(on?)`) — handle NAMES are shared with
link-map on purpose; `scripts/device-smoke.mjs` depends on them. `observe()`
toggles the optional "observe" mode (the HUD's top-right button): it sweeps
the sun through a whole Seattle day on loop, driving the phase override each
frame from the real `sunPhaseAt` (`world/observe.ts`); off restores whatever
override was live before. The sweep is re-paced (not constant): it EXPANDS the
golden hours — sunset most of all — and hurries through the flat midday, by
spending real seconds in proportion to a per-day dwell weight built from the
real sun. While it runs, the camera also flies a curated cinematic REEL of the
most gorgeous parts of the city (`observer/tour.ts` `observeShot`, executed by
`observer/CameraRig.tsx`): low over the downtown transit tunnel (the underground
stations), riding a light-rail train and a SeaTac jet in their wake, skimming
the Burke-Gilman cyclists and the Lake Washington crossing — each stop narrated
by a quiet HUD caption. The reel yields to a touch for a few seconds
(`camera.observeGraceS`) so you can still take the wheel, then resumes.
`?debug` shows the HUD readout; `?tier=` forces a device tier;
`?phase=` pins the sun; `?weather=` pins the sky; `?tide=` pins the tide;
`?bloom=peak|none|0..1` pins the cherry-blossom season; `?gamenight` lights the
stadiums; `?seafair=on|off` pins the Seafair weekend (hydros + the Blue
Angels delta); `?canoe=peak|none` pins the Canoe Journeys season;
`?crows=off` clears the twilight crow commute; `?beams=on|off` pins or clears
the lighthouse beam sweeps (on lifts the night gate); `?jimothy=on|off` pins Ballard's
round raccoon; `?gumwall=on|off` loops or stills the Gum Wall pilgrimage;
`?cold=0..1|on|off` pins the coldness that puffs the ferry passengers' breath;
`?chalk=on|off` forces or clears the summer-weekend sidewalk chalk;
`?tod=` pins the orca pod's time of day (a 0..1 day fraction, a 0..24
hour, or dawn|morning|noon|afternoon|dusk|night) — the pod's foraging ground
migrates around the Sound by the Seattle hour (`map/Orcas.tsx`), and observe
mode sweeps it with the sun. `scripts/device-smoke.mjs` is the per-tier
regression harness (playwright-core, chromium at /opt/pw-browsers/chromium).
