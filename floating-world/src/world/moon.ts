// The real moon over Seattle. suncalc (the same ephemeris that drives the
// sun's phase and the tide) gives the moon's altitude, azimuth and lit
// fraction for any instant; this module turns those into the print's terms —
// whether the moon is up, where it sits in the sheet's sky band, how full it
// is and which limb carries the light. fx/MoonPrint.tsx paints it.
//
// Honesty at the sun's own tier: real astronomy, never an invented moon. A
// full-moon night genuinely differs from a new-moon night (a new moon draws
// nothing — the disc is dark, absence not invention), the moon rises and
// sets on the real Seattle ephemeris, and it hides behind real overcast.
// The screen mapping is stylized the way every layer here is — the moon
// crosses the bokashi band east to west and rides higher when it stands
// higher — but every input is the true sky.
//
// ?moon=off|on|full|new|0..1 pins it for demos, tests and screenshots
// (on/full/new/number lift the night + horizon gates; off clears the disc);
// __linkMap.moon() from the console.

import SunCalc from "suncalc";

const SEATTLE = { lat: 47.6062, lng: -122.3321 };

// The moon prints once it stands a hand above the horizon — below that the
// drawn skyline and the band's pigment own the edge of the sheet.
const ALT_MIN_RAD = 0.06;
// Where the disc may sit in the sheet (screen uv): within the bokashi band,
// under its deepest pigment at the very top edge.
const BAND_Y_LO = 0.78;
const BAND_Y_HI = 0.93;
const BAND_X_SWING = 0.36; // east limb of the crossing → west limb
const ALT_FULL_RAD = Math.PI / 3; // altitude that reaches the top of the ride

export interface MoonState {
  up: boolean; // above the horizon enough to print
  altitude: number; // radians above the horizon
  azimuth: number; // radians, suncalc convention (0 = south, + = westward)
  fraction: number; // lit fraction 0..1 (0 new, 1 full)
  waxing: boolean; // which limb is lit (waxing → the west/right limb)
  x: number; // 0..1 across the sheet
  y: number; // 0..1 up the sheet
}

/** Above-the-horizon gate, pure for tests. */
export function moonIsUp(altitude: number): boolean {
  return altitude > ALT_MIN_RAD;
}

/** Sheet x for a moon azimuth: the disc crosses the band east → west as the
 * night passes (suncalc azimuth: 0 south, −π/2 east, +π/2 west). */
export function moonScreenX(azimuth: number): number {
  return 0.5 + BAND_X_SWING * Math.sin(azimuth);
}

/** Sheet y for a moon altitude: low moon low in the band, riding toward the
 * top pigment as it climbs. Clamped to the band. */
export function moonScreenY(altitude: number): number {
  const t = Math.max(0, Math.min(1, altitude / ALT_FULL_RAD));
  return BAND_Y_LO + (BAND_Y_HI - BAND_Y_LO) * t;
}

/** The honest moon over Seattle at an instant — no override applied. */
export function moonStateAt(date: Date): MoonState {
  const pos = SunCalc.getMoonPosition(date, SEATTLE.lat, SEATTLE.lng);
  const ill = SunCalc.getMoonIllumination(date);
  return {
    up: moonIsUp(pos.altitude),
    altitude: pos.altitude,
    azimuth: pos.azimuth,
    fraction: Math.max(0, Math.min(1, ill.fraction)),
    // suncalc phase: 0 new → 0.5 full → 1 new again; the first half waxes.
    waxing: ill.phase < 0.5,
    x: moonScreenX(pos.azimuth),
    y: moonScreenY(pos.altitude),
  };
}

// --- override (?moon= / __linkMap.moon) -------------------------------------

export type MoonPin =
  | { kind: "off" }
  | { kind: "on"; fraction: number | null }; // null → keep the real fraction

/** Parse a ?moon= value, pure for tests. Unknown strings are no pin. */
export function parseMoonPin(raw: string | null): MoonPin | null {
  if (raw == null) return null;
  if (raw === "off") return { kind: "off" };
  if (raw === "on") return { kind: "on", fraction: null };
  if (raw === "full") return { kind: "on", fraction: 1 };
  if (raw === "new") return { kind: "on", fraction: 0 };
  const n = Number(raw);
  if (Number.isFinite(n)) return { kind: "on", fraction: Math.max(0, Math.min(1, n)) };
  return null;
}

function parseOverride(): MoonPin | null {
  if (typeof window === "undefined") return null;
  return parseMoonPin(new URLSearchParams(window.location.search).get("moon"));
}

let override: MoonPin | null = parseOverride();

/** Pin the moon: true/"full"/"new"/0..1 lift the gates, false hides the disc,
 * null restores the honest sky. Same effect as ?moon=. */
export function setMoonOverride(value: boolean | number | string | null) {
  if (value == null) override = null;
  else if (value === false) override = { kind: "off" };
  else if (value === true) override = { kind: "on", fraction: null };
  else override = parseMoonPin(String(value));
}

export function getMoonOverride(): MoonPin | null {
  return override;
}

/** The moon as the print draws it: the honest state, with any pin applied.
 * A pinned-on moon that is really below the horizon is hoisted to a good
 * demo seat (due south, mid-band) so screenshots never hunt the sky. */
export function moonState(date = new Date()): MoonState {
  const real = moonStateAt(date);
  if (override == null) return real;
  if (override.kind === "off") return { ...real, up: false };
  const hoisted = real.up
    ? real
    : { ...real, up: true, altitude: 0.6, azimuth: 0, x: moonScreenX(0), y: moonScreenY(0.6) };
  return override.fraction == null
    ? hoisted
    : { ...hoisted, fraction: override.fraction, waxing: true };
}
