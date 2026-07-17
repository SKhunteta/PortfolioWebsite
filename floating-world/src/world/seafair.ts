// Seafair weekend over Lake Washington. Every summer since 1950 the city's
// big weekend lands on the first weekend of August: unlimited hydroplanes
// thunder around the Stan Sayres log-boom course and the Blue Angels crack
// the sky over the lake (the I-90 bridge literally closes for them).
// seafairFactor() is 1 through the show hours of that weekend and 0 the rest
// of the year — a CALENDAR estimate of the festival's phase, deterministic
// from the wall clock like the stadium nights, never a live event feed. It
// prints no schedule, so it can't lie the way a readout could; off-weekend
// the lake is simply bare. Same honesty tier as bloom.ts and tide.ts.
//
// ?seafair=on|off|0.7 pins it for demos, tests and screenshots.

import { localHour } from "./traffic";
import { observeDisplayFrac } from "./observe";

// The show window: heats and flight demos run through the middle of the day.
// Ramps are an hour long — crews and crowds arrive, they don't blink on.
const SHOW_START_H = 10;
const SHOW_END_H = 18;
const EDGE_H = 1;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function parseOverride(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("seafair");
  if (raw == null) return null;
  if (raw === "" || raw === "on" || raw === "peak") return 1;
  if (raw === "off" || raw === "none") return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null;
}

let override: number | null = parseOverride();

export function setSeafairOverride(value: number | null) {
  override = value == null ? null : Math.max(0, Math.min(1, value));
}

// Seattle-local calendar parts. Intl.formatToParts costs a little, and the
// calendar crawls — cache and refresh every ~8 s, the traffic.ts throttle.
const DATE_FMT =
  typeof Intl !== "undefined"
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        weekday: "short",
      })
    : null;

const WEEKDAY: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

interface SeattleDate {
  month: number; // 1..12
  day: number; // 1..31
  weekday: number; // 0 Sunday .. 6 Saturday
}

const dateCache: { at: number; value: SeattleDate } = {
  at: -1e9,
  value: { month: 1, day: 1, weekday: 0 },
};

function seattleDate(date: Date): SeattleDate {
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  if (now - dateCache.at < 8000) return dateCache.value;
  dateCache.at = now;
  if (!DATE_FMT) return dateCache.value; // SSR / no-Intl: never Seafair
  let month = 1;
  let day = 1;
  let weekday = 0;
  for (const p of DATE_FMT.formatToParts(date)) {
    if (p.type === "month") month = parseInt(p.value, 10);
    else if (p.type === "day") day = parseInt(p.value, 10);
    else if (p.type === "weekday") weekday = WEEKDAY[p.value] ?? 0;
  }
  dateCache.value = { month, day, weekday };
  return dateCache.value;
}

// The honest calendar curve, no override — how "on" Seafair is at a given
// instant. Friday through Sunday of the first-Saturday-of-August weekend,
// through the midday show hours. During an observe sweep the hour rides the
// swept sky (observeDisplayFrac), so if today IS the weekend the show
// follows the light around the loop.
export function seafairFactorAt(date: Date): number {
  const { month, day, weekday } = seattleDate(date);
  if (month !== 8) return 0;
  // Weekday of Aug 1 from today's weekday and day-of-month, then the first
  // Saturday — no second Date/Intl round trip needed.
  const w1 = (((weekday - (day - 1)) % 7) + 7) % 7;
  const firstSat = 1 + ((6 - w1 + 7) % 7);
  if (day < firstSat - 1 || day > firstSat + 1) return 0; // Fri..Sun only
  const obs = observeDisplayFrac();
  const h = obs != null ? obs * 24 : localHour(date);
  return (
    smoothstep(SHOW_START_H - EDGE_H, SHOW_START_H + EDGE_H, h) *
    (1 - smoothstep(SHOW_END_H - EDGE_H, SHOW_END_H + EDGE_H, h))
  );
}

export function seafairFactor(date = new Date()): number {
  if (override != null) return override;
  return seafairFactorAt(date);
}
