// Sidewalk chalk half-life. On a dry summer weekend a small patch of colored
// chalk scribbles appears on a park path — procedural and childlike, drawn
// from that day's pastel tray. Each rain erases it (the wash-out is monotonic:
// once a shower has crossed the path, the chalk stays gone for the weekend).
// Some summer weekends it returns; some it doesn't — a deterministic per-
// weekend gate, so it isn't every weekend, and both days of one weekend share
// the same drawing. Impermanence at kid scale: the print's most fragile mark,
// gone by the next rain and not persisted — nothing to accumulate, only to lose.
//
// This module is the pure half (node-safe, vitest-covered): the summer-weekend
// calendar, the weekend id that groups Saturday with its Sunday, the pastel
// tray, the appearance gate, the chosen park path, and the seeded scribble
// generator. All rendering (and the live rain wash) lives in map/Chalk.tsx.

export interface ChalkStroke {
  pts: [number, number][]; // patch-local coords, roughly [-1, 1] each axis
  color: string; // pastel hex from the day's tray
  width: number; // relative stroke weight (× a base km in the renderer)
  closed?: boolean; // a ring (sun disc, hopscotch box) vs an open scribble
}

export interface ChalkPath {
  name: string; // the park, for the HUD caption
  lat: number;
  lng: number;
}

// A handful of real Seattle parks with the kind of wide, flat, kid-friendly
// path a chalk drawing lives on. One is chosen per appearing weekend.
export const CHALK_PATHS: ChalkPath[] = [
  { name: "Green Lake", lat: 47.68, lng: -122.3305 }, // the loop path, east lawn (land)
  { name: "Gas Works Park", lat: 47.6456, lng: -122.3344 },
  { name: "Cal Anderson Park", lat: 47.6175, lng: -122.3195 },
  { name: "Volunteer Park", lat: 47.6301, lng: -122.3153 },
  { name: "Seward Park", lat: 47.551, lng: -122.2557 },
  { name: "Alki Beach", lat: 47.5763, lng: -122.4098 },
];

// Sidewalk-chalk pastels — dusty and pale, the opposite register from the Gum
// Wall's saturated pigments. Every channel stays under the bright-paper bloom
// ceiling (~#f2), same rule the whole print keeps.
export const CHALK_PIGMENTS = [
  "#e8869c", // rose
  "#eaa356", // apricot
  "#e6d366", // butter
  "#84c78a", // mint
  "#6cb4de", // sky
  "#a98cd8", // lilac
  "#e68cc6", // bubblegum
  "#b4d266", // pear
] as const;

// Small deterministic hash → 0..1, matching world/gumwall.ts's date seed.
export function hash01(n: number): number {
  let h = n | 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// A tiny seeded PRNG (mulberry32). The whole drawing is generated from the
// weekend id — never Math.random — so two tabs and a reload see the SAME
// scribbles for a given weekend, the way the storm's strikes are hash-scheduled.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Stable integer id for the Saturday–Sunday weekend containing `date`, so a
 *  weekend's Saturday and its Sunday resolve to the same drawing. Built from
 *  the weekend's Saturday in LOCAL time (like the Gum Wall's day seed), so it
 *  is timezone-consistent with the rest of the piece. Defined for any date
 *  (weekdays resolve to the prior Saturday) so ?chalk=on can demo off-season. */
export function weekendId(date: Date): number {
  const back = (date.getDay() + 1) % 7; // Sun→1, Sat→0, weekdays→prior Saturday
  const sat = new Date(date.getFullYear(), date.getMonth(), date.getDate() - back);
  return sat.getFullYear() * 10000 + (sat.getMonth() + 1) * 100 + sat.getDate();
}

/** A dry-season weekend: Saturday or Sunday, June through August — the months
 *  a Seattle path stays dry long enough for chalk to matter. (The honest rain
 *  wash still applies on top; this is only the calendar window.) */
export function isSummerWeekend(date: Date): boolean {
  const day = date.getDay();
  const month = date.getMonth(); // 5,6,7 = Jun,Jul,Aug
  return (day === 0 || day === 6) && month >= 5 && month <= 7;
}

// Not every summer weekend — a little over half. The rest the path stays bare:
// absence, not invention, the same honesty the empty Seafair weekends keep.
const APPEAR_P = 0.6;

/** Whether chalk appears at all this weekend. Deterministic per weekend id. */
export function weekendAppears(id: number): boolean {
  return hash01(id * 2654435761) < APPEAR_P;
}

/** The weekend's pastel tray: four of the eight chalks, chosen deterministically
 *  from the weekend id — one kid, one box of chalk, for the whole weekend. */
export function chalkTray(id: number): string[] {
  const order = CHALK_PIGMENTS.map((c, i) => ({ c, k: hash01(id * 8 + i * 101) }));
  order.sort((a, b) => a.k - b.k);
  return order.slice(0, 4).map((o) => o.c);
}

/** Which park path this weekend's drawing lives on. */
export function pickPath(id: number): ChalkPath {
  return CHALK_PATHS[Math.floor(hash01(id * 40503) * CHALK_PATHS.length) % CHALK_PATHS.length];
}

// --- the scribbles ----------------------------------------------------------
// Childlike motifs, each a set of polylines in patch-local space (roughly
// [-0.9, 0.9]). A drawing is two or three of these, placed apart and colored
// from the tray. Kept small on purpose — a small patch, a few marks.

const TAU = Math.PI * 2;

function wobble(rng: () => number, amp: number): number {
  return (rng() - 0.5) * 2 * amp;
}

/** A scribbled spiral — the universal "I got a new color" scrawl. */
function spiral(rng: () => number, cx: number, cy: number, r: number, color: string): ChalkStroke {
  const turns = 2 + Math.floor(rng() * 2);
  const steps = turns * 12;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = t * turns * TAU + rng() * 0.2;
    const rad = r * (0.15 + 0.85 * t);
    pts.push([cx + Math.cos(ang) * rad + wobble(rng, r * 0.06), cy + Math.sin(ang) * rad + wobble(rng, r * 0.06)]);
  }
  return { pts, color, width: 1 };
}

/** A zigzag — a lightning bolt, a row of grass, a kid's signature. */
function zigzag(rng: () => number, cx: number, cy: number, r: number, color: string): ChalkStroke {
  const teeth = 3 + Math.floor(rng() * 3);
  const pts: [number, number][] = [];
  for (let i = 0; i <= teeth; i++) {
    const x = cx - r + (2 * r * i) / teeth;
    const y = cy + (i % 2 === 0 ? -r * 0.5 : r * 0.5) + wobble(rng, r * 0.12);
    pts.push([x, y]);
  }
  return { pts, color, width: 1 };
}

/** A sun — a lopsided disc with a fan of rays. Every child draws one. */
function sun(rng: () => number, cx: number, cy: number, r: number, color: string): ChalkStroke[] {
  const disc: [number, number][] = [];
  const n = 14;
  const rr = r * 0.5;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const wr = rr * (0.9 + wobble(rng, 0.12));
    disc.push([cx + Math.cos(a) * wr, cy + Math.sin(a) * wr]);
  }
  const strokes: ChalkStroke[] = [{ pts: disc, color, width: 1.1, closed: true }];
  const rays = 6 + Math.floor(rng() * 3);
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * TAU + rng() * 0.1;
    const r0 = rr * 1.15;
    const r1 = r * (0.85 + wobble(rng, 0.15));
    strokes.push({
      pts: [
        [cx + Math.cos(a) * r0, cy + Math.sin(a) * r0],
        [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1],
      ],
      color,
      width: 0.8,
    });
  }
  return strokes;
}

/** A wavy rainbow arc — a couple of colored bands. */
function rainbow(rng: () => number, cx: number, cy: number, r: number, colors: string[]): ChalkStroke[] {
  const bands = Math.min(3, colors.length);
  const strokes: ChalkStroke[] = [];
  for (let b = 0; b < bands; b++) {
    const rad = r * (0.55 + b * 0.22);
    const pts: [number, number][] = [];
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const a = Math.PI + (i / steps) * Math.PI; // upper half
      pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.9 + wobble(rng, r * 0.03)]);
    }
    strokes.push({ pts, color: colors[b], width: 1 });
  }
  return strokes;
}

/** Hopscotch — a little stack of wobbly boxes. */
function hopscotch(rng: () => number, cx: number, cy: number, r: number, color: string): ChalkStroke[] {
  const boxes = 3 + Math.floor(rng() * 2);
  const s = r * 0.5;
  const strokes: ChalkStroke[] = [];
  for (let i = 0; i < boxes; i++) {
    const by = cy - r + i * s * 1.05;
    const w = s * (0.9 + wobble(rng, 0.1));
    const box: [number, number][] = [
      [cx - w / 2 + wobble(rng, s * 0.06), by],
      [cx + w / 2 + wobble(rng, s * 0.06), by],
      [cx + w / 2 + wobble(rng, s * 0.06), by + s * 0.9],
      [cx - w / 2 + wobble(rng, s * 0.06), by + s * 0.9],
    ];
    strokes.push({ pts: box, color, width: 0.9, closed: true });
  }
  return strokes;
}

/** Generate a weekend's drawing: two or three childlike motifs, placed apart
 *  on the patch and colored from the tray. Deterministic in the weekend id. */
export function buildScribbles(id: number, tray: string[]): ChalkStroke[] {
  const rng = mulberry32((id ^ 0x9e3779b9) >>> 0);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length) % arr.length];
  const trayColor = () => pick(tray);

  const kinds = ["spiral", "zigzag", "sun", "rainbow", "hopscotch"] as const;
  const count = 2 + Math.floor(rng() * 2); // 2 or 3 marks — a small patch
  // Two or three loose slots across the patch so the marks don't overlap.
  const slots: [number, number][] = [
    [-0.45, 0.3],
    [0.42, -0.28],
    [0.05, 0.5],
  ];

  const strokes: ChalkStroke[] = [];
  const used = new Set<string>();
  for (let i = 0; i < count; i++) {
    let kind = pick(kinds as unknown as string[]);
    // Avoid drawing the same motif twice in one small patch.
    let guard = 0;
    while (used.has(kind) && guard++ < 4) kind = pick(kinds as unknown as string[]);
    used.add(kind);

    const [cx, cy] = slots[i];
    const r = 0.32 + rng() * 0.12;
    switch (kind) {
      case "spiral":
        strokes.push(spiral(rng, cx, cy, r, trayColor()));
        break;
      case "zigzag":
        strokes.push(zigzag(rng, cx, cy, r, trayColor()));
        break;
      case "sun":
        strokes.push(...sun(rng, cx, cy, r, trayColor()));
        break;
      case "rainbow":
        strokes.push(...rainbow(rng, cx, cy, r, tray));
        break;
      case "hopscotch":
        strokes.push(...hopscotch(rng, cx, cy, r, trayColor()));
        break;
    }
  }
  return strokes;
}

// --- override (?chalk=on|off / __linkMap.chalk) -----------------------------
// on forces a patch onto the path regardless of season (for demos and the
// smoke harness); off clears it. null restores the honest summer-weekend gate.

function parseOverride(): boolean | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("chalk");
  if (raw == null) return null;
  return raw !== "off" && raw !== "0" && raw !== "none";
}

let override: boolean | null = parseOverride();

export function setChalkOverride(value: boolean | null) {
  override = value;
}

export function chalkOverride(): boolean | null {
  return override;
}

/** The full descriptor for the weekend containing `date`: its id, whether it
 *  naturally appears (season + gate), and — regardless — the tray, path and
 *  scribbles that weekend would draw (so ?chalk=on can force one off-season).
 *  The live rain wash and day/night fade are applied in the renderer. */
export function chalkForDate(date: Date): {
  id: number;
  appears: boolean;
  tray: string[];
  path: ChalkPath;
  scribbles: ChalkStroke[];
} {
  const id = weekendId(date);
  const tray = chalkTray(id);
  return {
    id,
    appears: isSummerWeekend(date) && weekendAppears(id),
    tray,
    path: pickPath(id),
    scribbles: buildScribbles(id, tray),
  };
}
