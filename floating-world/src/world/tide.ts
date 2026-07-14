// A living tide on Puget Sound. The shoreline pigment doesn't sit still: it
// pools and recedes on a slow tide, derived from where the real Sun and Moon
// stand over Seattle (suncalc — the same engine world/sun.ts uses for
// daylight). The semidiurnal swing tracks the Moon's hour angle — two highs a
// day as the city rotates under the lunar tidal bulge — and the Sun adds the
// fortnightly spring/neap breathing when the two align.
//
// This is an ASTRONOMICAL ESTIMATE of the tide's PHASE, deterministic from the
// clock — never a tide-gauge reading. It only moves the paint (how far the
// blue pools up the strand), it never prints a number, so it can't lie about a
// height the way the weather word or the honesty badge could. Same honesty
// rule as the sun: real geometry, no invented data.
//
// ?tide=high|low|-0.3 pins it for demos, tests, and screenshots.

import SunCalc from "suncalc";

const SEATTLE = { lat: 47.6062, lng: -122.3321 };

function parseOverride(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("tide");
  if (raw == null) return null;
  if (raw === "high") return 1;
  if (raw === "low") return -1;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(-1, Math.min(1, n)) : null;
}

let override: number | null = parseOverride();

export function setTideOverride(value: number | null) {
  override = value == null ? null : Math.max(-1, Math.min(1, value));
}

/** Signed tide level in [-1, 1]: -1 low water, 0 mid, +1 high water. */
export function tideLevel(date = new Date()): number {
  if (override != null) return override;
  const moon = SunCalc.getMoonPosition(date, SEATTLE.lat, SEATTLE.lng);
  const sun = SunCalc.getPosition(date, SEATTLE.lat, SEATTLE.lng);
  // Azimuth is measured from due south (0) toward west; a body's tidal bulge
  // peaks at meridian transit (azimuth 0 upper, ±π lower) and troughs near the
  // eastern/western horizon — cos(2·azimuth) captures that semidiurnal shape,
  // high at both transits. The Moon dominates (~2/3); the Sun's third adds the
  // spring/neap swing, largest when the two share an azimuth.
  const level = 0.66 * Math.cos(2 * moon.azimuth) + 0.34 * Math.cos(2 * sun.azimuth);
  return Math.max(-1, Math.min(1, level));
}
