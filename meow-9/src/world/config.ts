// Tuning constants. Live-tune with Leva, then bake the winners back here.

export const MEOW = {
  startG: 1, // boot at full spin — the cats are cozy until you touch the dial
  secondsPerCycle: 150, // untouched dial: one slow 1g → 0g → 1g breath

  // Physics-lite. A touch under Earth gravity so everything reads floaty-cute.
  gAccel: 7.5, // m/s² at g = 1
  airDrag: 0.4, // 1/s velocity bleed while airborne

  // Behavior bands on the dial.
  liftG: 0.4, // props pop off their rest spots below this
  driftG: 0.25, // cats can't stay grounded below this
  lightPawG: 0.55, // floaty-stride band starts below this
  landG: 0.32, // drifting cats start re-landing above this

  // Laser pointer.
  chaseRadius: 4.5, // cats inside this notice the dot
  pounceRange: 1.05, // grounded cats commit to the pounce inside this
} as const;

// The hab module interior. Floor at y = 0, walls at ±w/2 / ±d/2, ceiling at h.
export const ROOM = {
  w: 14,
  h: 5,
  d: 10,
  margin: 0.4, // soft-collision inset from every face
  bounce: -0.35, // velocity retained (and flipped) on a wall kiss
} as const;

// Porthole in the back wall (z = -d/2).
export const PORTHOLE = { y: 2.2, r: 1.6 } as const;
