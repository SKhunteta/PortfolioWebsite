import { Color, MathUtils, Vector3 } from "three";
import { KETU, type KetuConfig } from "./config";

// All functions here are PURE: (phase, config) -> value. No state, no side effects.
// The WorldClock owns `phase`; everything visual derives from these helpers so the
// world stays perfectly deterministic and scrub-able.

const { clamp, degToRad, smoothstep } = MathUtils;
const DEG = Math.PI * 2;

/** Seasonal sun elevation in degrees. Peaks at phase 0, bottoms at phase 0.5. */
export function sunElevationDeg(phase: number, cfg: KetuConfig = KETU): number {
  return cfg.meanElevationDeg + cfg.amplitudeDeg * Math.cos(phase * DEG);
}

/** Azimuth in radians — sweeps `azimuthTurns` times per year to make a spiral. */
export function sunAzimuthRad(phase: number, cfg: KetuConfig = KETU): number {
  return phase * DEG * cfg.azimuthTurns;
}

/** Normalized world-space direction TOWARD the sun (y is up). */
export function sunDirection(phase: number, cfg: KetuConfig = KETU): Vector3 {
  const el = degToRad(sunElevationDeg(phase, cfg));
  const az = sunAzimuthRad(phase, cfg);
  const cosEl = Math.cos(el);
  return new Vector3(cosEl * Math.sin(az), Math.sin(el), cosEl * Math.cos(az)).normalize();
}

/**
 * "Dayness" in [0,1]: 1 during Bright, 0 during Dark, smooth through the hinge.
 * This is the master crossfade for color grade, fog, aurora opacity, sugarfield
 * density, fauna spawn tables — everything that differs between the two worlds.
 */
export function dayness(phase: number, cfg: KetuConfig = KETU): number {
  return smoothstep(sunElevationDeg(phase, cfg), -6, 6);
}

const WARM = new Color(1.0, 0.5, 0.22); // low sun / golden hour
const DAYLIGHT = new Color(1.0, 0.97, 0.92); // high sun

/** Directional-light color + intensity for the sun at a given phase. */
export function sunLight(phase: number, cfg: KetuConfig = KETU): { color: Color; intensity: number } {
  const el = sunElevationDeg(phase, cfg);
  const warmth = smoothstep(el, 0, 22); // 0 = golden, 1 = white daylight
  const color = WARM.clone().lerp(DAYLIGHT, warmth);
  const intensity = clamp(smoothstep(el, -6, 4) * 2.4, 0, 2.4);
  return { color, intensity };
}

/** Human-readable label for the HUD. */
export function seasonLabel(phase: number, cfg: KetuConfig = KETU): string {
  const el = sunElevationDeg(phase, cfg);
  const d = dayness(phase, cfg);
  if (d > 0.85) return "The Bright";
  if (d < 0.15) return "The Dark";
  return el > 0 && phase < 0.5 ? "Fall Hinge" : "Rise Hinge";
}
