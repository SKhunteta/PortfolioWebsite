// Cherry-blossom season over Seattle. bloomFactor() ramps up in mid-March,
// holds through the last week of March (the UW Quad's Yoshino cherries at
// peak), and fades by mid-April; 0 the rest of the year. Deterministic from
// the date — a CALENDAR estimate of the bloom's PHASE, never a live bloom
// report, and it prints no date, so it can't lie the way a readout could. Same
// honesty rule as the sun, the tide and the weather: real timing, no invented
// data. The blossoms simply aren't there out of season.
//
// ?bloom=peak|none|0.6 pins it for demos, tests and screenshots.

// Day-of-year anchors (non-leap approximation is plenty for a soft seasonal
// curve): Mar 10 ≈ 69, Mar 25 ≈ 84, Apr 2 ≈ 92, Apr 15 ≈ 105.
const RAMP_START = 69;
const PEAK_START = 84;
const PEAK_END = 92;
const RAMP_END = 105;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

function parseOverride(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("bloom");
  if (raw == null) return null;
  if (raw === "peak") return 1;
  if (raw === "none") return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null;
}

let override: number | null = parseOverride();

export function setBloomOverride(value: number | null) {
  override = value == null ? null : Math.max(0, Math.min(1, value));
}

export function getBloomOverride(): number | null {
  return override;
}

// The honest calendar curve, no override — how full the blossom is on a given
// day over Seattle.
export function bloomFactorAt(date: Date): number {
  const d = dayOfYear(date);
  if (d <= RAMP_START || d >= RAMP_END) return 0;
  if (d < PEAK_START) return smoothstep(RAMP_START, PEAK_START, d);
  if (d <= PEAK_END) return 1;
  return 1 - smoothstep(PEAK_END, RAMP_END, d);
}

export function bloomFactor(date = new Date()): number {
  if (override != null) return override;
  return bloomFactorAt(date);
}
