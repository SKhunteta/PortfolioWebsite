// The Gum Wall pilgrimage — Post Alley, under Pike Place Market. Since 1993,
// when Market Theater improv patrons started parking their gum (pennies
// pressed in) on the alley brick, every visitor has added a piece; by 2015 it
// took 94 buckets and 2,350 pounds of steam-cleaning to bare the brick, and
// the wall began again the same week.
//
// In the print the rite is YOURS: once per visit a lone pilgrim walks Post
// Alley, pauses at the wall, and presses in a single dot of saturated pigment
// drawn from that day's small palette. The dots persist in localStorage, so a
// returning viewer's copy of the print ages uniquely — a woodblock that wears
// differently with each impression pulled. At capacity the wall is
// steam-cleaned (the honest 2015 beat) and begins again.
//
// This module is the pure state half (node-safe, vitest-covered): pigments,
// the date-seeded day palette, the dot store and its cleaning rule, and the
// ?gumwall= override. All rendering lives in map/GumWall.tsx.

export interface GumDot {
  u: number; // 0..1 along the wall
  v: number; // 0..1 up the wall (reach-biased by the caller)
  c: string; // pigment hex
  t: number; // epoch ms when pressed
}

// The real wall took 22 years to earn its cleaning; the print's takes a few
// hundred visits. Big enough to feel permanent, small enough that a devoted
// viewer might one day witness the steam-clean.
export const WALL_CAPACITY = 366;

const KEY = "soundrail.gumwall.v1";

// Saturated woodblock pigments — the one place the print allows confetti.
// Every channel stays under the bright-paper bloom ceiling (~#f2).
export const PIGMENTS = [
  "#d94f2e", // vermilion
  "#2b5d8f", // Prussian
  "#6f9a3f", // matcha
  "#e0a12f", // saffron
  "#8f4370", // plum
  "#e0863c", // persimmon
  "#2f8f86", // teal
  "#c23a55", // beni crimson
] as const;

// Small deterministic hash → 0..1, for the date seed.
function hash01(n: number): number {
  let h = n | 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** The day's palette: four of the eight pigments, chosen deterministically
 *  from the calendar date — everyone who visits today draws from the same
 *  small tray, but each visit's dot is its own pick. */
export function dayPigments(date: Date): string[] {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const order = PIGMENTS.map((c, i) => ({ c, k: hash01(seed * 8 + i) }));
  order.sort((a, b) => a.k - b.k);
  return order.slice(0, 4).map((o) => o.c);
}

// Storage is injectable so the pure logic tests (and SSR-less node) never
// touch window.localStorage directly.
export interface DotStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): DotStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // storage blocked (private mode) — the wall lives one visit
  }
}

export function loadDots(storage: DotStorage | null = defaultStorage()): GumDot[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { dots?: GumDot[] };
    if (!Array.isArray(parsed.dots)) return [];
    return parsed.dots
      .filter(
        (d) =>
          d &&
          Number.isFinite(d.u) &&
          Number.isFinite(d.v) &&
          typeof d.c === "string" &&
          /^#[0-9a-f]{6}$/i.test(d.c),
      )
      .slice(0, WALL_CAPACITY);
  } catch {
    return [];
  }
}

export function saveDots(dots: GumDot[], storage: DotStorage | null = defaultStorage()) {
  if (!storage) return;
  try {
    storage.setItem(KEY, JSON.stringify({ v: 1, dots }));
  } catch {
    // quota/private mode: the press still shows this visit, just won't keep
  }
}

/** Press one piece into the wall. At capacity the wall is steam-cleaned first
 *  (the 2015 beat) and the new dot is the fresh start. Returns the new array
 *  (never mutates the input) plus whether the cleaning happened. */
export function commitDot(dots: GumDot[], dot: GumDot): { dots: GumDot[]; cleaned: boolean } {
  const cleaned = dots.length >= WALL_CAPACITY;
  return { dots: cleaned ? [dot] : [...dots, dot], cleaned };
}

// ?gumwall=on|off — on loops the pilgrimage for demos/screenshots (a pilgrim
// every pass instead of once per visit), off stills the alley (the wall and
// its accumulated dots stay; only the walking figure is gated).
function parseOverride(): boolean | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("gumwall");
  if (raw == null) return null;
  return raw !== "off" && raw !== "0" && raw !== "none";
}

let override: boolean | null = parseOverride();

// A demo/test summon: the next frame pulls the pilgrim's walk start up to
// now instead of waiting out the settle delay (map/GumWall.tsx consumes it).
let summoned = false;

export function summonPilgrim() {
  summoned = true;
}

export function consumeSummon(): boolean {
  const s = summoned;
  summoned = false;
  return s;
}

export function setGumwallOverride(value: boolean | null) {
  override = value;
}

export function gumwallOverride(): boolean | null {
  return override;
}
