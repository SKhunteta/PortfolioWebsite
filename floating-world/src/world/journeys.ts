// Canoe-journey season on the Salish Sea. The city is named for siʔaɫ —
// Chief Seattle of the Duwamish and Suquamish — and cedar canoe families
// still cross these waters every summer during Tribal Canoe Journeys, the
// intertribal paddle revived in 1989. journeysFactor() ramps up in
// mid-July, holds through the paddle's traditional late-July/early-August
// window, and fades by mid-August; 0 the rest of the year.
//
// Honesty rule, same tier as bloom.ts: the real Journeys' route and landing
// dates vary by year and host nation, so this is a CALENDAR estimate of the
// season's PHASE — deterministic from the date, never a live report, and it
// prints no date or destination, so it can't lie. Out of season the bay is
// simply bare water.
//
// ?canoe=peak|none|0.6 pins it for demos, tests and screenshots.

// Day-of-year anchors (non-leap approximation is plenty for a soft seasonal
// curve): Jul 9 ≈ 190, Jul 15 ≈ 196, Aug 4 ≈ 216, Aug 11 ≈ 223.
const RAMP_START = 190;
const PEAK_START = 196;
const PEAK_END = 216;
const RAMP_END = 223;

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
  const raw = new URLSearchParams(window.location.search).get("canoe");
  if (raw == null) return null;
  if (raw === "" || raw === "on" || raw === "peak") return 1;
  if (raw === "off" || raw === "none") return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null;
}

let override: number | null = parseOverride();

export function setJourneysOverride(value: number | null) {
  override = value == null ? null : Math.max(0, Math.min(1, value));
}

// The honest calendar curve, no override — how deep into the paddling season
// a given day sits.
export function journeysFactorAt(date: Date): number {
  const d = dayOfYear(date);
  if (d <= RAMP_START || d >= RAMP_END) return 0;
  if (d < PEAK_START) return smoothstep(RAMP_START, PEAK_START, d);
  if (d <= PEAK_END) return 1;
  return 1 - smoothstep(PEAK_END, RAMP_END, d);
}

export function journeysFactor(date = new Date()): number {
  if (override != null) return override;
  return journeysFactorAt(date);
}
