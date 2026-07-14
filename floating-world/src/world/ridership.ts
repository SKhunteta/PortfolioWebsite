// Ridership as pigment — how full a train is, expressed as the WEIGHT of the
// ink stroke it drags across the washi (Trails.tsx), never a number anyone
// reads. A packed rush-hour train lays down a bolder, wetter brushstroke; an
// empty 2am run leaves only a faint whisper of pigment.
//
// Honesty, in the same layered tiers the rest of the piece keeps:
//   real     — when the live GTFS-RT feed carries occupancy, that value wins
//              (the poller folds it onto train.occupancy). The crowd on that
//              train really is what deepens its ink.
//   ambient  — when the feed is silent about load (Sound Transit rarely
//              publishes occupancy, and simulated / resting modes never do),
//              fall back to the TRAFFIC tier of honesty: a deterministic curve
//              keyed to the real Seattle hour — heavy at the commute peaks,
//              near-empty overnight. Like the street cars (world/traffic.ts)
//              and the Burke-Gilman cyclists, it modulates a stylized quality
//              and is NEVER presented as a live per-train count.
//
// A stable per-train offset seeded from the id keeps the fleet from breathing
// in lockstep without inventing specificity — it's texture on the ambient
// base, not a claim about any one car.
//
// ?ridership=off|0..1 pins the ambient base for demos, tests and screenshots,
// matching the ?phase= / ?weather= / ?traffic= pins the rest of the piece
// already uses.

import type { TrainState } from "../trains/store";
import { localHour } from "./traffic";

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

// Two commute peaks over a faint all-day floor: a morning rush around 8:00,
// an evening rush around 17:30, a soft midday plateau, ~0.12 overnight. Same
// shape as the traffic curve, tuned so full trains are genuinely full.
function loadAt(hour: number): number {
  const am = Math.exp(-Math.pow((hour - 8.0) / 1.5, 2));
  const pm = Math.exp(-Math.pow((hour - 17.5) / 1.8, 2));
  const midday = 0.5 * Math.exp(-Math.pow((hour - 13.0) / 3.5, 2));
  return Math.min(1, 0.12 + 0.75 * Math.max(am, pm) + 0.2 * midday);
}

// FNV-1a over the id -> a stable ±0.12 offset, so two trains sharing an hour
// still carry visibly different ink without any of it being "real."
function idOffset(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) / 4294967295 - 0.5) * 0.24;
}

function parseOverride(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("ridership");
  if (raw == null) return null;
  if (raw === "off") return 0.5; // neutral everywhere — the pre-ridership look
  const n = Number(raw);
  return Number.isFinite(n) ? clamp01(n) : null;
}

let override: number | null = parseOverride();

export function setRidershipOverride(value: number | null): void {
  override = value == null ? null : clamp01(value);
}

// The ambient base only crawls (it tracks the wall clock); recomputing the
// real hour every frame for every train would burn an Intl.formatToParts each
// time, so cache it and refresh every ~8s — the same trick traffic.ts uses.
const cache = { at: -1e9, value: 0.4 };

function ambientBase(): number {
  if (override != null) return override;
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  if (now - cache.at < 8000) return cache.value;
  cache.at = now;
  cache.value = loadAt(localHour(new Date()));
  return cache.value;
}

/** Effective load 0..1 for a train: real feed occupancy when present, else the
 *  clock-keyed ambient estimate plus this train's stable offset. Cheap enough
 *  to call every frame — the hour is cached, the rest is arithmetic. */
export function ridershipLoad(train: TrainState): number {
  if (train.occupancy != null) return clamp01(train.occupancy);
  return clamp01(ambientBase() + idOffset(train.id));
}
