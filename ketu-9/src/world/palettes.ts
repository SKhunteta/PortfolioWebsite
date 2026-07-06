import { Color } from "three";

// Two color scripts, one world. `dayness` (0..1) crossfades between them.
// Until real .cube LUTs exist, these Colors stand in for the grade + fog + ambient.

export const PALETTE = {
  // Horizon / fog color the world dissolves into (aerial perspective).
  fogBright: new Color("#a9c4d6"), // pale cold-blue Bright haze
  fogDark: new Color("#0b1326"), // deep indigo Dark

  // Ambient / hemisphere fill.
  ambientBright: new Color("#6e8aa0"),
  ambientDark: new Color("#141d33"),

  // Ground placeholder tint (tundra vs frozen).
  groundBright: new Color("#6b7d5a"), // warm sugarfield-tundra green
  groundDark: new Color("#2a3550"), // cold, blued-out

  // Terrain material tint over Bright-neutral vertex colors (Milestone 3).
  // Near-white keeps the biome albedo honest in Bright; the Dark blues it out.
  terrainTintBright: new Color("#fff7ea"),
  terrainTintDark: new Color("#5a6a94"),

  // Placeholder sea surface (real Ocean lands in Milestone 6).
  seaBright: new Color("#3d5f72"),
  seaDark: new Color("#0e1830"),

  // Aurora hue (used later in the Dark).
  aurora: new Color("#3affb0"),
} as const;

const scratch = new Color();

/** Lerp two palette colors by t, returning a shared scratch Color (copy if you keep it). */
export function mix(a: Color, b: Color, t: number): Color {
  return scratch.copy(a).lerp(b, t);
}
