import { Color } from "three";

// Two lighting scripts, one room. `g` (0..1) crossfades between them:
// SPIN  (g = 1) — warm, cozy, lamps up, neon idling.
// DRIFT (g = 0) — the station lets go: lamps dim, neon and emergency
//                 accents rise, everything goes violet-teal.

export const PALETTE = {
  // Hemisphere fill.
  ambientSpin: new Color("#8a7f78"),
  ambientDrift: new Color("#4b4374"),
  groundSpin: new Color("#3c3630"),
  groundDrift: new Color("#181a2e"),

  // Key light (soft directional, gives the room its shadows).
  keySpin: new Color("#ffe6c4"),
  keyDrift: new Color("#8fa8ff"),

  // Warm cabin lamps vs the cool emergency accent.
  lampWarm: new Color("#ffd9a0"),
  lampCool: new Color("#6fd9ff"),

  // Neon strip hues (HDR-multiplied at runtime so they bloom).
  neonA: new Color("#ff5ecf"), // magenta
  neonB: new Color("#5ee9ff"), // cyan

  // The cats' fur rim — the backlit fuzz on every silhouette. Warm plum
  // under the lamps, cool neon-violet in the drift (in-family with keyDrift).
  furRimSpin: new Color("#8a7686"),
  furRimDrift: new Color("#6f7fd0"),
} as const;

const scratch = new Color();

/** Lerp two palette colors by t, returning a shared scratch Color (copy if you keep it). */
export function mix(a: Color, b: Color, t: number): Color {
  return scratch.copy(a).lerp(b, t);
}
