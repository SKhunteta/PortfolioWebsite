// Coarse device profile, decided once at boot. Touch devices get the lighter
// rendering path: capped DPR, fewer cats, cheaper materials, no composer,
// and a collapsed Leva. Keep new expensive effects behind this flag.
export const IS_TOUCH =
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
