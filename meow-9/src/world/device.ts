// Coarse device profile, decided once at boot. Touch devices get the lighter
// rendering path: capped DPR, fewer cats, cheaper materials, no composer,
// and a collapsed Leva. Keep new expensive effects behind this flag.
export const IS_TOUCH =
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

// Respect the visitor's motion preference (boot-time snapshot, same as
// IS_TOUCH). Under reduced motion the gravity dial doesn't auto-breathe and
// the cosmetic camera/laser jitters are stilled — everything the visitor
// drives themselves (scrubbing, touring, playing) still works.
export const REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
