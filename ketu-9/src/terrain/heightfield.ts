import { createNoise2D, type NoiseFunction2D } from "simplex-noise";
import { TERRAIN } from "../world/config";

// Ketu-9 heightfield — the geology generator.
// PURE and deterministic: sampleTerrain(x, z) always returns the same result for
// the same coordinates, so chunks can be built/discarded freely and gameplay
// queries (spawns, river tracing, footstep audio) agree with the render mesh.
//
// The composition expresses the lore (KETU-9-GAME-PLAN.md §6), not generic noise:
//   1. Continental base   — low-frequency FBM biased hard toward ocean (81% sea).
//   2. Splinterlands      — domain-warped ridged noise, amplified in the coastal
//                           band, so land shreds into fjords + thread-thin islands
//                           and valleys drown below sea level.
//   3. The Weld           — one gaussian continental dome over a volcanic arc
//                           (a ring of ridged peaks), with hot-spring vents.
//   4. Ice sheets         — relief above the snowline is flattened toward a slow
//                           glacial plateau; vents punch thawed holes in it.

// --- Deterministic seeded noise --------------------------------------------

function hashString(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const noiseFrom = (tag: string) => createNoise2D(mulberry32(hashString(`ketu-9:${tag}`)));

const nContinent = noiseFrom("continent");
const nWarpX = noiseFrom("warp-x");
const nWarpZ = noiseFrom("warp-z");
const nFjord = noiseFrom("fjord-ridge");
const nArc = noiseFrom("volcanic-arc");
const nDetail = noiseFrom("detail");
const nVent = noiseFrom("vent");
const nIce = noiseFrom("ice");

// --- Small pure helpers ------------------------------------------------------

function smooth01(x: number, e0: number, e1: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Standard FBM, roughly in [-1, 1]. */
function fbm(n: NoiseFunction2D, x: number, z: number, octaves: number): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * n(x * freq, z * freq);
    norm += amp;
    freq *= 2;
    amp *= 0.5;
  }
  return sum / norm;
}

/** Ridged FBM in [0, 1] — sharp crests, the fjord/arc skeleton. */
function ridged(n: NoiseFunction2D, x: number, z: number, octaves: number): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    const v = 1 - Math.abs(n(x * freq, z * freq));
    sum += amp * v * v;
    norm += amp;
    freq *= 2;
    amp *= 0.5;
  }
  return sum / norm;
}

// --- Geology constants (meters) ----------------------------------------------
// These are the generator's own tuning; gameplay-facing constants are in config.ts.

const CONTINENT_WL = 9000; // continental landmass wavelength
const OCEAN_BIAS = 0.36; // raise to drown more land (tuned for ~80% ocean)
const BASE_AMP = 950; // continental relief amplitude

const WARP_WL = 2600; // domain-warp wavelength
const WARP_AMP = 850; // domain-warp strength — bends fjords into drowned valleys
const FJORD_WL = 1500; // fjord ridge/valley wavelength
const FJORD_BASE = 200; // fjord relief far from the coast
const FJORD_COASTAL = 720; // extra fjord relief inside the coastal band
const COASTAL_BAND = 700; // |base elevation| range that counts as "coastal"

const WELD_X = -8200; // the Weld dome center (world space, post-offset)
const WELD_Z = -9600;
const WELD_RADIUS = 5200;
const WELD_HEIGHT = 820;
const ARC_RADIUS = 4300; // volcanic arc ring radius around the Weld center
const ARC_WIDTH = 1300;
const ARC_WL = 2300;
const ARC_HEIGHT = 430;

const DETAIL_WL = 160;
const DETAIL_AMP = 16;

const GLACIER_COMPRESS = 0.6; // relief multiplier above the snowline
const ICE_NOISE_WL = 700;
const ICE_NOISE_AMP = 22;

const VENT_WL = 750;
const VENT_SINK = 45; // vents melt shallow thawed pans into the ice

export interface TerrainSample {
  /** Elevation in meters relative to sea level (negative = sea floor). */
  height: number;
  /** 1 near sea level (the living fjord rind), 0 deep inland/offshore. */
  coastal: number;
  /** Weld dome mask, 0..1. */
  weld: number;
  /** Hot-spring refugium warmth, 0..1 — thawed even in the Dark. */
  vent: number;
  /** Glacial ice cover, 0..1. */
  ice: number;
}

const scratch: TerrainSample = { height: 0, coastal: 0, weld: 0, vent: 0, ice: 0 };

export function sampleTerrain(xIn: number, zIn: number, out: TerrainSample = scratch): TerrainSample {
  const x = xIn + TERRAIN.originX;
  const z = zIn + TERRAIN.originZ;

  // 1. Continental base — mostly below sea level.
  const c = fbm(nContinent, x / CONTINENT_WL, z / CONTINENT_WL, 4);
  const base = (c - OCEAN_BIAS) * BASE_AMP;

  // 2. Splinterlands — warped ridges shred the coastal band into fjords/islands.
  const wx = x + WARP_AMP * fbm(nWarpX, x / WARP_WL, z / WARP_WL, 3);
  const wz = z + WARP_AMP * fbm(nWarpZ, x / WARP_WL, z / WARP_WL, 3);
  const ridge = ridged(nFjord, wx / FJORD_WL, wz / FJORD_WL, 4);
  const coastal = 1 - smooth01(Math.abs(base), 60, COASTAL_BAND);
  const fjord = (ridge - 0.45) * (FJORD_BASE + FJORD_COASTAL * coastal);

  // 3. The Weld — continental dome + volcanic arc ring.
  const dw = Math.hypot(x - WELD_X, z - WELD_Z);
  const weld = Math.exp(-(dw * dw) / (2 * WELD_RADIUS * WELD_RADIUS));
  const arcBand = Math.exp(-((dw - ARC_RADIUS) * (dw - ARC_RADIUS)) / (2 * ARC_WIDTH * ARC_WIDTH));
  const arc = ridged(nArc, wx / ARC_WL, wz / ARC_WL, 3) * ARC_HEIGHT * arcBand;

  let h = base + fjord + weld * WELD_HEIGHT + arc;
  h += DETAIL_AMP * fbm(nDetail, x / DETAIL_WL, z / DETAIL_WL, 2);

  // 4. Vents — hot-spring refugia clustered on the volcanic arc / Weld flanks.
  const ventRidge = ridged(nVent, x / VENT_WL, z / VENT_WL, 2);
  const ventZone = smooth01(weld + arcBand, 0.18, 0.55);
  let vent = smooth01(ventRidge, 0.66, 0.8) * ventZone;

  // 5. Ice sheets — flatten relief above the snowline into slow glacial plateau.
  const snow = TERRAIN.snowlineM;
  if (h > snow) {
    h = snow + (h - snow) * GLACIER_COMPRESS + ICE_NOISE_AMP * fbm(nIce, x / ICE_NOISE_WL, z / ICE_NOISE_WL, 2);
  }
  let ice = smooth01(h, snow - 40, snow + 70);

  // Vents stay thawed: melt shallow pans and clear the ice locally.
  vent *= smooth01(h, -10, 40); // no vents on the open sea floor
  h -= vent * VENT_SINK;
  ice *= 1 - vent;

  out.height = h;
  out.coastal = coastal;
  out.weld = weld;
  out.vent = vent;
  out.ice = ice;
  return out;
}

/** Fast height-only lookup (shared scratch — do not hold the result). */
export function sampleHeight(x: number, z: number): number {
  return sampleTerrain(x, z, scratch).height;
}
