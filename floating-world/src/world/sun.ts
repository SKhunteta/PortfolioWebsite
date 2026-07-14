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

export function getPhaseOverride(): number | null {
  return override;
}

// The raw altitude→phase map, with no override — the honest sun over Seattle
// at a given instant. Observe mode (world/observe.ts) sweeps `date` across a
// whole day and feeds each step straight into the phase override.
export function sunPhaseAt(date: Date): number {
  const altDeg =
    (SunCalc.getPosition(date, SEATTLE.lat, SEATTLE.lng).altitude * 180) / Math.PI;
  const t = (altDeg - NIGHT_ALT_DEG) / (DAY_ALT_DEG - NIGHT_ALT_DEG);
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped); // smoothstep
}

export function sunPhase(date = new Date()): number {
  if (override != null) return override;
  return sunPhaseAt(date);
}

// The HUD's manual time-of-day dial walks a full Seattle day by hand. We anchor
// its 0..1 sweep to today's solar midnight (nadir) as a REAL instant, so the arc
// is timezone- and DST-correct no matter where the viewer sits: frac 0 = deep
// night, ~0.5 = solar noon, 1 = back to night. Each step is a true instant fed
// straight into sunPhaseAt, so the light curve stays as honest as the live sun.
const DAY_MS = 24 * 60 * 60 * 1000;

function dayFractionToDate(frac: number): Date {
  const nadir = SunCalc.getTimes(new Date(), SEATTLE.lat, SEATTLE.lng).nadir;
  return new Date(nadir.getTime() + frac * DAY_MS);
}

/** Honest sun phase for a 0..1 position across today's Seattle solar day. */
export function sunPhaseForFraction(frac: number): number {
  return sunPhaseAt(dayFractionToDate(frac));
}

/** The Seattle wall-clock time at a 0..1 day position, e.g. "6:42 AM". */
export function seattleClockAt(frac: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
  }).format(dayFractionToDate(frac));
}
