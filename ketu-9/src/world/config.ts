// KETU-9 planetary constants.
// These are gameplay/rendering constants, not the physical scattering constants
// (those live in the atmosphere shader). Everything here is meant to be tuned live
// via Leva and then baked back into this file.

export const KETU = {
  // --- Sun path (drives the whole mood) ------------------------------------
  // Ketu-9 has an extreme axial tilt: a short Bright (sun never sets) and a long
  // Dark (sun never rises). We model the *seasonal* sun as a spiral:
  //   elevation swings once per year; azimuth sweeps around several times.
  //
  // elevationDeg(phase) = meanElevationDeg + amplitudeDeg * cos(2π * phase)
  //   phase 0.0  -> peak Bright (highest sun)
  //   phase 0.5  -> deep Dark   (lowest sun, well below horizon)
  //
  // Defaults below give roughly a 1/3 Bright, 2/3 Dark year (the "4 months / 8
  // months" lore split). Push meanElevationDeg down to lengthen the Dark.
  meanElevationDeg: -18,
  amplitudeDeg: 52,
  azimuthTurns: 2, // full azimuth sweeps across one year -> spiral, not arc

  // --- Clock ----------------------------------------------------------------
  secondsPerYear: 1500, // ~25 min per full Bright->Dark->Bright cycle
  startPhase: 0.02, // begin near peak Bright so the first thing you see is gold

  // --- Camera / scale (meters) ---------------------------------------------
  cameraHeightM: 1000, // treated as ~1km above surface for scattering math
  skyDomeRadius: 4000, // visual dome; kept centered on the camera each frame
  groundSize: 12000, // placeholder ground plane extent

  // --- Fog (aerial perspective) --------------------------------------------
  fogNear: 400,
  fogFar: 9000,
} as const;

export type KetuConfig = typeof KETU;

// --- Milestone 3: terrain -----------------------------------------------------
// Gameplay-facing terrain constants. Noise wavelengths/amplitudes (the "geology")
// live next to the generator in src/terrain/heightfield.ts; these are the knobs
// the rest of the game reads.
export const TERRAIN = {
  seaLevelM: 0, // sea level is the world origin plane — everything references it
  snowlineM: 380, // above this, land is glacial ice sheet (~2/3 of land, per canon)

  // World-space offset baked in so that (0,0) spawns on a Splinterlands coast
  // with fjords in view (found empirically by scanning the heightfield).
  originX: 6650,
  originZ: 3370,

  // Chunked LOD quadtree.
  rootSize: 24576, // meters covered by the quadtree root (camera-centered)
  minChunk: 192, // finest chunk size in meters (leaf cell ≈ 6 m at res 33)
  chunkRes: 33, // vertices per chunk side
  lodFactor: 1.25, // subdivide while cameraDist < size * lodFactor
  rebuildDistance: 180, // recompute the tile set when the camera moves this far
} as const;

export type TerrainConfig = typeof TERRAIN;
