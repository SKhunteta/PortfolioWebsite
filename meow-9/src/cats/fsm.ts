// Cat behavior states + the pose timelines the Observer director choreographs
// against. Timelines live HERE — not in Cat.tsx — because they are the
// CONTRACT between a cat and the director: shots do timing math against them
// (e.g. "cue the pounce at 2 s so the leap lands exactly on the cut").

export type CatMode =
  | "sit"
  | "loaf"
  | "walk"
  | "groom"
  | "sleep"
  | "chase" // running down the laser dot
  | "pounce" // crouch → butt-wiggle → leap (timeline below)
  | "drift" // low-g tumble + air-paddle
  | "land"; // crouch-absorb after re-entry (cats land on their feet)

/** Pounce timeline (seconds from cue / commit). */
export const POUNCE = {
  crouch: 0.5, // flattened, locked on
  wiggleEnd: 1.2, // the butt-wiggle — non-negotiable
  leap: 1.35, // paws leave the deck
  total: 2.3, // budget until the ballistic arc usually resolves
} as const;

/** Grooming session length (used by the director's shot math). */
export const GROOM_TOTAL = 3.8;

/** Crouch-absorb after touchdown. */
export const LAND_TOTAL = 0.85;

/** Weighted grounded-mode pick, biased by personality. `r` in [0,1). */
export function pickGroundedMode(r: number, lazy: number, playful: number): CatMode {
  const weights: [CatMode, number][] = [
    ["sit", 1],
    ["loaf", 1 + 2.2 * lazy],
    ["walk", 1.3 + 1.9 * playful], // roam a little more — a livelier room
    ["groom", 1],
    ["sleep", 0.45 + 1.3 * lazy],
  ];
  let total = 0;
  for (const [, w] of weights) total += w;
  let x = r * total;
  for (const [mode, w] of weights) {
    if ((x -= w) <= 0) return mode;
  }
  return "sit";
}

/** How long a grounded mode holds before the next decision. `r` in [0,1). */
export function modeDuration(mode: CatMode, r: number): number {
  switch (mode) {
    case "loaf":
      return 7 + r * 10;
    case "sleep":
      return 9 + r * 14;
    case "sit":
      return 3 + r * 5;
    case "groom":
      return GROOM_TOTAL;
    case "walk":
      return 4 + r * 6;
    default:
      return 4;
  }
}
