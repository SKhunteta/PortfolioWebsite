import { Color } from "three";
import { TERRAIN } from "../world/config";
import type { TerrainSample } from "./heightfield";

// Biome classification + Milestone-3 placeholder coloring.
// classify() is the gameplay-facing mapping (spawn tables, scanner entries, audio
// will key off BiomeId later). biomeColor() writes a per-vertex albedo that makes
// the landscape legible until the Milestone-4 triplanar PBR shader replaces it.
// Colors are authored "Bright-neutral": the seasonal Bright/Dark crossfade is a
// material tint driven by dayness() in Terrain.tsx, per the WorldClock contract.

export type BiomeId =
  | "ocean_floor"
  | "fjord_shore"
  | "sugarfield_tundra"
  | "rock_upland"
  | "glacier"
  | "weld_interior"
  | "vent_refugium";

export function classifyBiome(s: TerrainSample): BiomeId {
  if (s.vent > 0.35) return "vent_refugium";
  if (s.height < TERRAIN.seaLevelM) return "ocean_floor";
  if (s.ice > 0.5) return "glacier";
  if (s.weld > 0.45) return "weld_interior";
  if (s.height < 14) return "fjord_shore";
  if (s.height < 170 && s.coastal > 0.35) return "sugarfield_tundra";
  return "rock_upland";
}

// Palette (Bright-neutral placeholder albedo).
const DEEP_FLOOR = new Color("#0d1a2a");
const SHALLOW_FLOOR = new Color("#2c4a5e");
const SHORE = new Color("#7c7f68"); // wet grit / kelp line
const SUGARFIELD = new Color("#5f7a4a"); // the living green rind
const TUNDRA = new Color("#6b7458"); // drier upland tundra
const ROCK = new Color("#655f57");
const GLACIER = new Color("#dbe6ef");
const BASALT = new Color("#453f3c"); // Weld volcanic interior
const VENT = new Color("#a86844"); // mineral-stained thawed pans

const cA = new Color();
const cB = new Color();

const lerp3 = (out: Color, a: Color, b: Color, t: number) =>
  out.copy(a).lerp(b, Math.min(1, Math.max(0, t)));

/**
 * Smoothly blended vertex color for a terrain sample. `dither` (±1, from cheap
 * noise) breaks up banding along elevation contours. Writes into `out`.
 */
export function biomeColor(s: TerrainSample, dither: number, out: Color): Color {
  const h = s.height + dither * 6;

  if (h < 0) {
    // Sea floor: darker with depth. (The water surface itself is Milestone 6.)
    return lerp3(out, SHALLOW_FLOOR, DEEP_FLOOR, -h / 420);
  }

  // Land: shore grit -> green rind -> tundra -> bare rock by elevation.
  lerp3(out, SHORE, SUGARFIELD, (h - 4) / 14);
  const green = 0.45 + 0.55 * s.coastal; // rind is greenest near the sea
  lerp3(cA, TUNDRA, out, green);
  lerp3(out, cA, ROCK, (h - 130) / 160);

  // Weld interior reads as dark basalt above its flanks.
  lerp3(out, out, BASALT, s.weld * smoothMask(h, 60, 220));

  // Ice sheet wins above the snowline.
  lerp3(out, out, GLACIER, s.ice);

  // Vent refugia stay thawed and mineral-warm, punching through the ice.
  lerp3(cB, out, VENT, s.vent);
  return out.copy(cB);
}

function smoothMask(x: number, e0: number, e1: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
