// Baked tuning. Leva-tune in dev, then move the numbers here.

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
    waterEdgeWidthKm: 0.12,
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
    submergedRailY: -0.05, // rail below this = underground platform bucket
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
    // The Observe reel (observer/tour.ts `observeShot`): while Observe mode runs
    // the print through a whole day, the camera also takes a slow, curated
    // flight around the most gorgeous parts of the city — riding the light rail
    // and the jets (the reel's heart), dropping low over the downtown tunnel,
    // skimming the cyclists. dwellS is the SHORT hold for the orbit interludes;
    // the rides carry their own longer dwell (tour.ts RIDE_DWELL_S) so most of
    // the reel is spent in a low, zoomed-in chase. travelS glides between stops.
    observeReel: { dwellS: 7, travelS: 5 },
    minDistance: 0.8,
    maxDistance: 90,
    // Close enough that the toy S700 fills the frame; speed pulls it back.
    chaseOffsetKm: { back: 0.7, up: 0.26 },
    // The jetliner ride: farther back and a touch higher than the train chase
    // (the toy 737 is longer and moves faster), offset behind the nose along
    // the flight path so the camera sits in the plane's wake as it climbs,
    // banks and touches down. Sits a little higher (and a touch farther back)
    // than a pure tail-chase so the ride shows more of the city sliding by
    // below the wing, not just the fuselage ahead.
    planeChaseOffsetKm: { back: 1.5, up: 0.52 },
    chaseLerp: 2.2, // per-second exponential approach
    doubleTapPx: 48, // train pick radius in screen space
  },
} as const;
