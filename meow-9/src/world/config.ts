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

  // Contact physics — cats, toys, furniture.
  catBodyR: 0.22, // cat body circle radius at size 1 (separation + kicks)
  kickSpeed: 1.35, // horizontal speed a trotting paw imparts to a toy
  ballRestitution: 0.55, // kicked toys bouncing on the deck
  rollFriction: 1.7, // 1/s horizontal bleed while a toy rolls under weight
} as const;

// The synthesized soundscape mix (see audio/engine.ts). Conservative on
// purpose — the hum especially is an all-session drone.
export const AUDIO = {
  master: 0.5,
  hum: 0.16, // hum gain at 1g (full spin — the motors work)
  humFloor: 0.015, // hum gain at 0g (the drift is hushed)
  whoosh: 0.22, // peak gravity-scrub whoosh
  purr: 0.5, // purr voice level
  thump: 0.5, // touchdown thud peak at full strength
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
