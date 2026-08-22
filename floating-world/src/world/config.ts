// Baked tuning. Leva-tune in dev, then move the numbers here.

// Temporarily disables the ambient sound feature (HUD toggle + engine
// activation) without removing any of the audio code. Flip back to true
// to re-enable.
export const SOUND_FEATURE_ENABLED = false;

// Temporarily disables the Observe world toggle (the HUD's top-right
// "observe" button that sweeps the sun through a whole Seattle day and
// flies the cinematic reel) without removing any of the observe code. The
// __linkMap.observe() dev handle still works. Flip back to true to re-expose
// the button in the HUD.
export const OBSERVE_FEATURE_ENABLED = false;

export const CONFIG = {
  poll: {
    intervalMs: 10_000, // matches the backend cache TTL
    backoffMs: [10_000, 30_000, 60_000],
  },
  tween: {
    vNominalKmS: 0.02, // ~70 km/h cruising
    vMaxKmS: 0.045, // catch-up ceiling (~2x nominal)
    jitterIgnoreKm: 0.05, // GPS noise: ignore small backward deltas
    snapWindowKm: 2.5, // nearest-s search half-window around the hint
    rejectSnapKm: 0.5, // a vehicle this far off-shape is not on this line
    teleportKm: 3, // beyond this (tab resume), fast-forward instead
  },
  ribbon: {
    widthKm: 0.16,
    y: { "at-grade": 0.02, elevated: 0.32, tunnel: -0.22 } as Record<string, number>,
    intensity: { "at-grade": 1.0, elevated: 1.12, tunnel: 0.4 } as Record<string, number>,
  },
  train: {
    spriteKm: 0.9, // glow sprite footprint (far-scale fallback)
    coreIntensity: 2.6, // HDR core, over the 1.05 bloom threshold
    dwellStationKm: 0.12, // station pulses when a train is this close
    // Zoom-out visibility ease (drives the trail swell and the sumi halo).
    // Deliberately its OWN camera-distance range, NOT the toy-scale one: the
    // model eases toward real size across 6..40 km, but the drift camera only
    // sits ~16 km out, so these cues must saturate MUCH sooner to actually be
    // "full" when zoomed out. ~0 in chase (< ~4 km), ~1 by drift framing.
    farVisNearKm: 4,
    farVisFarKm: 15,
    // The toy S700: the model IS the position marker at every zoom —
    // exaggerated at drift distance, easing toward real scale up close.
    model: {
      farLenKm: 0.55,
      nearLenKm: 0.2,
      nearCamKm: 6,
      farCamKm: 40,
      // Real S700 section proportions (~30 m × 2.65 m × 3.8 m), kept a
      // touch chunky for the toy read.
      widthFrac: 0.1, // of length
      heightFrac: 0.13,
      sectionGapFrac: 0.04, // articulation joint, hides in the dark bevel
      noseRakeFrac: 0.3,
      headlightCore: 2.2, // HDR — blooms on the leading end only
      spriteDim: 0.65, // halo dimmed so the model reads through it
      scaleLerpPerS: 3,
      // Sumi ink halo: a soft normal-blended pigment ring the train drops
      // onto the bright washi at drift distance. Additive glow is the weakest
      // mark on day paper, so an INK outline is what makes a passing train
      // pop when zoomed out. Gated by dayness (night leans on bloom) and by
      // the far ease (gone up close, where the model's own ink seams carry it).
      inkHaloScale: 2.4, // footprint, × modelL
      inkHaloOpacity: 0.5, // peak ink alpha at full day + drift
    },
  },
  basemap: {
    waterY: -0.06,
    waterEdgeY: -0.05,
    parkY: -0.08,
    roadY: { arterial: 0.01, major: 0.014 } as Record<string, number>,
    // Diagrammatic, not literal — same toy-scale license the trains and
    // landmarks already take. Ground-sample distance at drift is ~20–47
    // m/px depending on aspect (portrait is worse — see camera.portrait);
    // these widths hold >=1.5px even at the steeper portrait framing, where
    // the old 60–110 m strokes fell under 1.3px and vanished into AA.
    roadWidthKm: { major: 0.16, arterial: 0.09 } as Record<string, number>,
    // Wide enough that the tideline motif (map/Water.tsx EDGE_FRAG) reads as
    // its own exposed-mudflat band at drift distance, not just a thin rim —
    // real Puget Sound tideflats run to a few hundred meters at some shores.
    waterEdgeWidthKm: 0.4,
    waterEdgeMinHoleKm2: 1.0,
    wobbleAmpKm: 0.03,
    wobbleFreq: 0.35,
    // Seigaiha wave-fans in the night water: fan radius holds the ring
    // spacing (radius/rings ≈ 200 m) above the drift ground-sample so the
    // arcs survive the resample instead of dissolving into AA.
    seigaihaRadiusKm: 0.8,
    seigaihaRings: 4,
  },
  // The street traffic (map/Cars.tsx): individual toy cars gliding the real
  // road network — the ferry/cyclist tier of honesty (deterministic ambient
  // life, keyed to the real Seattle hour, never a live feed). toyLenKm is the
  // storybook car length; speedKmS a city-driving pace (~40 km/h); y floats
  // them a hair over the road ink; laneOffsetKm slides opposing directions to
  // opposite sides of the stroke; fadeKm is the run at each corridor end over
  // which a car eases in/out so the loop never pops; minCorridorKm is the
  // shortest road segment long enough to drive.
  car: {
    toyLenKm: 0.11,
    speedKmS: 0.011,
    speedJitter: 0.35, // ±fraction, deterministic per car
    y: 0.022,
    laneOffsetKm: 0.03,
    fadeKm: 0.14,
    minCorridorKm: 0.45,
  },
  // The bus fleet (map/Buses.tsx + world/buses.ts): King County Metro toy
  // buses working the long major streets stop to stop — drive a hop, ease to
  // the curb (laneOffset + curbKm), dwell dwellS, pull back out. Keyed to
  // Metro's service span, not car traffic pressure. speedKmS is the cruising
  // pace between stops (~29 km/h; dwells drag the average down to a real
  // in-service pace); stopSpacingKm is the target hop (~real Metro spacing);
  // minCorridorKm keeps routes off two-block stubs.
  bus: {
    toyLenKm: 0.19,
    speedKmS: 0.008,
    speedJitter: 0.25, // ±fraction, deterministic per bus
    y: 0.022,
    laneOffsetKm: 0.03,
    curbKm: 0.016,
    stopSpacingKm: 0.42,
    dwellS: 7,
    fadeKm: 0.14,
    minCorridorKm: 1.1,
    // The LIVE fleet's glide (world/busFeed.ts + map/Buses.tsx): each real
    // coach eases exponentially toward its latest GTFS-RT fix — ratePerS is
    // gentle on purpose (fixes land every 10–60 s; a bus should drift toward
    // its stop, not lunge) — snapping when the gap is too wide to interpolate
    // honestly (tab resume, a coach reassigned across town). fadeInS eases a
    // newly-appearing coach onto the page instead of popping it; fadeOutS
    // eases one back off when the crowd rule below thins it away (slower —
    // a coach should withdraw into the paper, not blink out).
    live: {
      ratePerS: 0.35,
      snapKm: 1.2,
      fadeInS: 1.5,
      fadeOutS: 2.4,
    },
    // The CROWD rule (world/metroBuses.ts `crowdShare`/`busRank`): Metro runs
    // up to ~1,200 coaches at peak, and drawn all at once from the drift
    // camera they read as confetti scattered over the print — the rail, the
    // hero of the piece, drowns in them. So the fleet keys to how far back
    // the viewer is STANDING: zoomed into a neighborhood (within fullKm of
    // the paper) every coach on the block is out; standing back at drift
    // framing (thinKm and beyond) the print holds `driftShare` of them.
    // Thinning is a deterministic per-coach rank, so a coach fades in and out
    // with the camera and never flickers — a SUBSET of the real fleet, never
    // an invented one. rapidRideBias pulls RapidRide coaches to the front of
    // that rank: what survives at drift is weighted toward the frequent trunk
    // network, which is the shape a viewer at that distance can actually
    // read. It is a modest bias on purpose — a hard one would leave the
    // thinned page looking like a red-line-only system, a claim about the
    // fleet mix the print has no business making. Zoom in and every coach is
    // back, mix and all.
    crowd: {
      fullKm: 3.5,
      thinKm: 12,
      driftShare: 0.2,
      rapidRideBias: 0.45,
    },
  },
  // The Burke-Gilman cyclists (map/Cyclists.tsx): toy figures, storybook-large
  // like the trains and ferries, riding at a real ~18 km/h pace.
  cyclist: {
    toyLenKm: 0.13,
    speedKmS: 0.005,
    y: 0.02,
  },
  trail: {
    sampleEveryS: 0.12,
    widthKm: 0.09,
    intensity: 0.55,
    // Zoomed out, the eye catches a train by its MOTION, not a still dot: the
    // wake widens, deepens, and holds its tail toward drift distance (driven
    // by the same per-train camera-distance ease the toy scale uses), so a
    // passing train smears a visible brushstroke across the print.
    farWidthBoost: 1.7,
    farIntensityBoost: 1.7,
    // Ridership as pigment (world/ridership.ts): a train's load 0..1 scales the
    // brushstroke's width and ink around a neutral half-full. A packed train
    // drags a bolder, wetter stroke; an empty late-night run a faint whisper.
    // Gentle gains — this is a mood on the ink, not a data readout.
    load: { neutral: 0.5, widthGain: 0.6, inkGain: 0.85 },
  },
  station: {
    radiusKm: 0.08,
    pulseScale: 1.55, // a swell, not a supernova — 2.1 read as a ping-pong ball
    hoverRadiusPx: 28,
    // The identity layer: each station's watercolor seal (a pigment blot at
    // the surface in the station's researched accent) and, for underground
    // halls, the faint light shaft sinking from the seal to the platform.
    sealRadiusKm: 0.19,
    orbLiftKm: 0.03, // orb center rides just above its rail height
    shaftRadiusKm: 0.035,
  },
  camera: {
    // The drift's home is downtown (Westlake sits at the projection origin),
    // not the all-stations centroid — the 2 Line drags that out over Lake
    // Washington and the opening shot frames nothing.
    heartX: 1.4,
    heartZ: 0.4,
    driftRadiusKm: 16,
    driftElevation: 0.92, // radians above the horizon
    // Portrait framing: more top-down than landscape, so the north–south
    // spine runs UP the screen instead of compressing into a horizon band
    // under a fisheye FOV. But NOT so much farther/higher that it halves
    // the ground-sample density — a first pass at radius 20 / elev 1.22
    // (cam height 18.8 km, ~47 m/px) undersampled every stroke this
    // config just widened to fix, on real devices. This framing keeps
    // slant distance close to desktop's (~20 km) so roads and landmarks
    // that are legible in landscape stay legible turned sideways.
    portrait: { radiusKm: 13, elevation: 1.02 },
    driftRadSec: 0.02, // slow orbit
    driftBreathKm: 2.2,
    idleResumeS: 30,
    // While Observe mode runs, its camera reel takes over after this short a
    // pause — so toggling Observe starts the cinematic flight almost at once,
    // yet a touch still hands the wheel back for a beat before the reel resumes.
    observeGraceS: 4,
    // A reel ride only latches onto a train within this far of the stop's
    // anchor; past it the stop falls back to a low orbit, so we never claim to
    // "ride the crossing" while chasing a train that's actually downtown.
    observeRideMaxKm: 6,
    // Cinematic idle tour (observer/tour.ts): after this many seconds of no
    // input the camera leaves its downtown drift and tours the whole line,
    // holding dwellS at each stop and travelS between them. Set well past
    // idleResumeS so an attentive visitor never trips it — only a truly idle
    // display (a screensaver, a gallery) drifts into the tour.
    tourAfterS: 42,
    tour: { dwellS: 7, travelS: 6 },
    // The Observe reel (observer/tour.ts `observeShot`) runs on its OWN seconds
    // clock — explicit, even per-stop holds — decoupled from the sun-warp so its
    // pacing never gets crushed (a flashed-by midday stop) or dragged (a dead
    // night orbit). `travelS` glides between stops; `orbitDwellS` is the SHORT
    // hold for the orbit interludes (rides/close-ups/vistas carry their own
    // longer dwell in tour.ts's `REEL`, so most of the reel is spent riding the
    // trains and jets low through the print). The whole loop's length is
    // REEL_PERIOD (tour.ts), and the sky day-sweep is locked to the same period
    // (observe.ts `CYCLE_S`) so a stop lands under roughly the same sky each loop.
    observeReel: { travelS: 1.5, orbitDwellS: 3 },
    minDistance: 0.4,
    maxDistance: 90,
    // The free-orbit / aerial tilt clamp on OrbitControls (polar angle from
    // straight-down): 1.38 rad ≈ 79°, so the camera can never flip under the
    // map. CameraRig relaxes it per-frame ONLY while a low vista holds (below).
    maxPolarAngle: 1.38,
    // The low "vista" shots (observer/tour.ts `vista` stops, framed by CameraRig
    // `frameTracksideChase`): the camera drops to an eye-line beside the rail and
    // FOLLOWS a latched train down the line (the same at-vehicle-level ride as the
    // manual click-to-follow), composed so the glowing ribbon recedes past it to
    // the scenic horizon — Rainier on the southern run, the skyline out of SODO.
    // These need the polar clamp relaxed past vertical and the 0.4 km distance
    // floor dropped, both applied per-frame ONLY while a vista holds (free-orbit
    // keeps the 1.38 clamp, so manual control is unchanged).
    atGradeMaxPolar: 1.62, // ~93°: look at (and a hair above) the horizon
    tracksideMinDistance: 0.15,
    tracksideChase: {
      camHeightKm: 0.05, // ~50 m eye-line, above at-grade rail (0.02) and water (−0.06)
      backKm: 0.6, // set back along the rail on the anti-scenic side of the train
      sideKm: 0.3, // lateral offset → the rail sweeps diagonally (three-quarter)
      speedBackK: 4, // extra set-back the faster the ridden train runs
      lookAheadKm: 2.5, // target pushed down-tangent PAST the train toward the horizon:
      //                   small = plain vehicle follow, large = ribbon-to-horizon
      lookHeightKm: 0.06, // target a hair above the camera → a faint upward tilt
      fovBoost: 3, // widen the lens a touch → exaggerate the receding leading line
      maxKm: 12, // widened latch radius: a vista rides the nearest train within this
    },
    // Close enough that the toy S700 fills the frame; speed pulls it back.
    chaseOffsetKm: { back: 0.7, up: 0.26 },
    // The Observe reel's "diving into the underground" stop: a grade-aware lift
    // on top of the ordinary chase. As the ridden train sinks from at-grade
    // toward tunnel depth (`ribbon.y.tunnel`), the camera eases from the low
    // wake-chase (`chaseOffsetKm`) toward these values — RISING to `up` and
    // pulling nearly overhead (`back` shrinks toward the portal) — so the shot
    // becomes a look-down that watches the train slip under the translucent
    // paper past the underground light shafts, instead of tilting low along its
    // heading and sweeping Elliott Bay (the water plane sits at basemap.waterY
    // −0.06, ABOVE the −0.22 tunnel) onto the horizon. Camera height only ever
    // grows here, so it stays well clear of the water. Raise `upKm` if the
    // water still peeks in at wide aspects.
    tunnelDive: { backKm: 0.15, upKm: 0.85 },
    // Click-to-descend into a fixed underground hall (CameraRig.frameStationDive):
    // unlike the train tunnelDive (which rides a moving train down a portal), this
    // holds a slightly-angled look-down over the hall's platform floor. Framed a
    // touch higher/wider than the old fresco close-up so the dive INCISION reads
    // whole: the deckled tear in the sheet, its inked rim, and the terraced paper
    // layers stepping down to the hall (map/paperCut.ts). The hold also PRECESSES
    // slowly around the hall (`precessRadSec`, radians/s of camera orbit) so the
    // stacked sheets keep sliding past one another in parallax — the carve stays
    // alive through the hold instead of freezing into a still. Tune with `leva`.
    stationDive: { backKm: 0.55, upKm: 1.05, precessRadSec: 0.045 },
    // The jetliner ride: farther back and a touch higher than the train chase
    // (the toy 737 is longer and moves faster), offset behind the nose along
    // the flight path so the camera sits in the plane's wake as it climbs,
    // banks and touches down. Sits a little higher (and a touch farther back)
    // than a pure tail-chase so the ride shows more of the city sliding by
    // below the wing, not just the fuselage ahead.
    planeChaseOffsetKm: { back: 1.5, up: 0.52 },
    // The Observe reel's close-up "detail" stops (observer/tour.ts `detail`
    // flag): instead of sitting in the vehicle's wake, the camera slides in
    // tight and OFF TO THE SIDE — a slow three-quarter broadside so the
    // woodblock detail reads. `side` swings the camera onto the flank so the
    // livery fills the frame; `fwd`/`back` gives the three-quarter angle (the
    // train close-up sits a hair AHEAD to catch the nose cap + headlights and
    // the wave running back down the flank, the jet a hair BEHIND to catch the
    // tail device with the fuselage wordmark); `up` looks gently down the
    // roofline. Distances are a small fraction of the ordinary chase so the
    // ~200 m toy overfills the frame and the ink seams, lit windows and
    // Prussian-over-vermilion wave (jet: tail device + wordmark) read.
    trainDetailOffsetKm: { fwd: 0.06, side: 0.24, up: 0.07 },
    planeDetailOffsetKm: { back: 0.14, side: 0.4, up: 0.12 },
    // OrbitControls clamps camera-to-target to [minDistance, maxDistance]. The
    // detail close-ups sit well inside the ordinary 0.4 km floor, so CameraRig
    // drops the floor to this while a detail shot holds (restored afterward);
    // still clear of the 0.1 km camera near plane.
    detailMinDistance: 0.12,
    chaseLerp: 2.2, // per-second exponential approach
    doubleTapPx: 48, // train pick radius in screen space
  },

  // Ferry deck life (map/FerryDeck.tsx) — the close-zoom reveal that turns a
  // toy ferry into a vessel. Deck heights and positions are in UNIT-BOAT local
  // coords (× the vessel's toyLengthKm → world), matching Ferries.buildBoat's
  // decks: the hull tops out near y 0.07, the cabin runs 0.07..0.145, its roof
  // is the promenade. The reveal ramp is a straight camera-to-vessel distance.
  ferryDeck: {
    revealNearKm: 1.7, // fully drawn once the camera is this close to a hull
    revealFarKm: 4.5, // nothing beyond here — the whole layer hides itself
    promenadeY: 0.155, // sun-deck rail, just above the cabin roof
    railZ: 0.062, // half-width the promenade rail sits at (cabin is 0.15 wide)
    railX: [-0.28, 0.3] as const, // fore–aft span the rail crowd spreads along
    bowX: 0.365, // the forward point the lone bow-watcher always stands at
    bowY: 0.085, // main-deck bow height, forward of and below the cabin
    passengerHeight: 0.04, // figure height (local units) — storybook-chunky but legible
    carDeckY: 0.052, // the vehicle deck, glimpsed below the promenade
    carLaneZ: 0.042, // the two parked lanes' half-width
    carSpanX: [-0.33, 0.33] as const, // fore–aft span the cars park along
    carSize: { len: 0.09, wid: 0.052 }, // a parked-car rectangle (local units)
  },
} as const;
