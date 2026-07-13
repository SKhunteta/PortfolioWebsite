// Game nights, baked from the real schedules. GTFS knows nothing about why
// SODO glows on a Tuesday — this does: Mariners home games light T-Mobile
// Park, Sounders and Seahawks home games light Lumen Field. Baked by
// scripts/build-stadium-nights.mjs (repo root) into
// src/data/stadium-nights.json; the committed file may be the placeholder
// stub (workflow not yet run), in which case the stadiums simply never
// light — absence, not invention.
//
// Deterministic from the wall clock, like the backend simulator: given the
// same minute, every visitor sees the same lights. The envelope is the real
// rhythm of a game night — crews bring the lights up ~75 minutes before
// first pitch / kickoff, and the bowl glows for about three and a half
// hours after the start, fading in and out over twenty minutes.

import nightsJson from "../data/stadium-nights.json";

export type StadiumVenue = "lumen" | "tmobile";

export interface StadiumEvent {
  venue: StadiumVenue;
  startsAt: string; // ISO
  title?: string; // "Mariners v Angels"
}

interface RawNights {
  meta: { placeholder: boolean };
  events: StadiumEvent[];
}

const raw = nightsJson as unknown as RawNights;

export const HAS_STADIUM_NIGHTS = !raw.meta.placeholder && raw.events.length > 0;

interface Parsed {
  startMs: number;
  title: string | null;
}

const BY_VENUE: Record<StadiumVenue, Parsed[]> = { lumen: [], tmobile: [] };
for (const e of raw.events ?? []) {
  const startMs = Date.parse(e.startsAt);
  if (!Number.isFinite(startMs)) continue;
  if (e.venue !== "lumen" && e.venue !== "tmobile") continue;
  BY_VENUE[e.venue].push({ startMs, title: e.title ?? null });
}
for (const v of Object.values(BY_VENUE)) v.sort((a, b) => a.startMs - b.startMs);

const PRE_MS = 75 * 60_000; // lights warm before the crowd arrives
const POST_MS = 3.5 * 3_600_000; // the bowl glows through the final out
const EDGE_MS = 20 * 60_000; // fade in / fade out

function smooth(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/** 0..1 — how lit a stadium is at wall-clock time nowMs. */
export function stadiumGlow(venue: StadiumVenue, nowMs: number): number {
  let glow = 0;
  for (const e of BY_VENUE[venue]) {
    const on = e.startMs - PRE_MS;
    const off = e.startMs + POST_MS;
    if (nowMs < on - EDGE_MS) break; // sorted: nothing later is lit yet
    const g = smooth((nowMs - (on - EDGE_MS)) / EDGE_MS) * (1 - smooth((nowMs - off) / EDGE_MS));
    if (g > glow) glow = g;
  }
  return glow;
}

/** The current (or imminent) event's title, for the one caption. */
export function stadiumTitle(venue: StadiumVenue, nowMs: number): string | null {
  for (const e of BY_VENUE[venue]) {
    if (nowMs >= e.startMs - PRE_MS - EDGE_MS && nowMs <= e.startMs + POST_MS + EDGE_MS) {
      return e.title;
    }
  }
  return null;
}
