// Real Seattle daylight drives the palette. phase() maps solar altitude to
// [0,1]: 0 = full night (the hero look), 1 = full day (the cooler, paler
// variant), with a soft ramp through civil twilight.
//
// ?phase=night|dusk|day|0.42 pins it for demos, tests, and screenshots.

import SunCalc from "suncalc";

const SEATTLE = { lat: 47.6062, lng: -122.3321 };

const NIGHT_ALT_DEG = -6; // civil twilight ends
const DAY_ALT_DEG = 10;

function parseOverride(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("phase");
  if (raw == null) return null;
  if (raw === "night") return 0;
  if (raw === "dusk") return 0.35;
  if (raw === "day") return 1;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null;
}

let override: number | null = parseOverride();

export function setPhaseOverride(value: number | null) {
  override = value == null ? null : Math.max(0, Math.min(1, value));
}

export function sunPhase(date = new Date()): number {
  if (override != null) return override;
  const altDeg =
    (SunCalc.getPosition(date, SEATTLE.lat, SEATTLE.lng).altitude * 180) / Math.PI;
  const t = (altDeg - NIGHT_ALT_DEG) / (DAY_ALT_DEG - NIGHT_ALT_DEG);
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped); // smoothstep
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Alpenglow: the warm flush the high snow catches when the sun sits near the
 *  horizon at real sunrise/sunset — rising in through early twilight, fading
 *  back out as full day takes hold, and nothing at deep night or midday. A
 *  hump over the same [0,1] phase band, so ?phase=dusk pins it for demos too.
 *  Symmetric across the day: the same band is crossed at dawn and at dusk. */
export function alpenglow(phase = sunPhase()): number {
  const rise = smoothstep(0.06, 0.34, phase);
  const fall = 1 - smoothstep(0.42, 0.72, phase);
  return rise * fall;
}
