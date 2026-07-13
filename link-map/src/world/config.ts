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
    // The toy S700: the model IS the position marker at every zoom —
    // exaggerated at drift distance, easing toward real scale up close.
    model: {
      farLenKm: 0.55,
      nearLenKm: 0.16,
      nearCamKm: 6,
      farCamKm: 40,
      widthFrac: 0.14, // of length
      heightFrac: 0.12,
      sectionGapFrac: 0.04, // articulation joint, hides in the dark bevel
      noseRakeFrac: 0.3,
      headlightCore: 2.2, // HDR — blooms on the leading end only
      spriteDim: 0.65, // halo dimmed so the model reads through it
      scaleLerpPerS: 3,
    },
  },
  basemap: {
    waterY: -0.06,
    waterEdgeY: -0.05,
    parkY: -0.08,
    roadY: { arterial: 0.01, major: 0.014 } as Record<string, number>,
    roadWidthKm: { major: 0.06, arterial: 0.035 } as Record<string, number>,
    waterEdgeWidthKm: 0.12,
    waterEdgeMinHoleKm2: 1.0,
    wobbleAmpKm: 0.03,
    wobbleFreq: 0.35,
  },
  trail: {
    sampleEveryS: 0.12,
    widthKm: 0.09,
    intensity: 0.55,
  },
  station: {
    radiusKm: 0.11,
    pulseScale: 2.1,
    hoverRadiusPx: 28,
  },
  camera: {
    driftRadiusKm: 30,
    driftElevation: 0.92, // radians above the horizon
    driftRadSec: 0.02, // slow orbit
    driftBreathKm: 2.2,
    idleResumeS: 30,
    minDistance: 0.8,
    maxDistance: 90,
    // Close enough that the toy S700 fills the frame; speed pulls it back.
    chaseOffsetKm: { back: 0.62, up: 0.34 },
    chaseLerp: 2.2, // per-second exponential approach
    doubleTapPx: 48, // train pick radius in screen space
  },
} as const;
