// Coarse device profile, decided once at boot. Touch devices get the lighter
// rendering path: capped DPR, fewer atmosphere march steps, collapsed Leva,
// and cheaper creature materials. Keep new expensive effects behind this flag.
export const IS_TOUCH =
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
