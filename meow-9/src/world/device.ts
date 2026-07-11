// Device profile, decided once at boot. Two independent axes:
//
//   TIER        — the RENDERING budget (phone / tablet / desktop), from
//                 screen size + touch. Every expensive knob keys off the
//                 PROFILE object below; new expensive effects pick their
//                 tier THERE, not with ad-hoc flags.
//   INPUT_TOUCH — the ERGONOMICS axis: fingers need 44 px targets and
//                 gesture-aware controls regardless of GPU budget.
//
// An iPad Pro is tier "tablet" + INPUT_TOUCH (desktop-class visuals,
// finger-sized UI). The old binary IS_TOUCH conflated the axes and gave
// iPads the phone budget — no composer, so the neon never bloomed.

export type Tier = "phone" | "tablet" | "desktop";

const hasWindow = typeof window !== "undefined";

function detect(): { tier: Tier; touch: boolean } {
  if (!hasWindow) return { tier: "desktop", touch: false };
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  // iPadOS 13+ masquerades as macOS: with a trackpad attached it reports a
  // FINE primary pointer and a Mac UA — but still exposes its touch points.
  // Without this check a Magic-Keyboard iPad silently becomes a "desktop"
  // and loses every touch ergonomic.
  const iPadMasquerade = navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent);
  const touch = coarse || iPadMasquerade;
  // (Windows touch-laptops report a fine primary pointer → desktop. Correct:
  // the mouse drives, and taps still work through pointer events.)
  const shortSide = Math.min(window.screen.width, window.screen.height);
  const auto: Tier = !touch ? "desktop" : shortSide >= 600 ? "tablet" : "phone";
  // ?tier= override — the debugging handle for real devices AND how tests
  // exercise branches emulation can't reach (Playwright caps emulated
  // maxTouchPoints at 1, so the masquerade path needs forcing).
  const forced = new URLSearchParams(window.location.search).get("tier");
  const tier: Tier =
    forced === "phone" || forced === "tablet" || forced === "desktop" ? forced : auto;
  return { tier, touch };
}

const d = detect();
export const TIER: Tier = d.tier;
export const INPUT_TOUCH = d.touch;

export interface DeviceProfile {
  catCount: number;
  fuzzShells: boolean; // translucent halo shells on the big cat masses
  physicalCatMat: boolean; // MeshPhysicalMaterial coat vs MeshStandardMaterial
  catShadows: boolean; // per-cat castShadow
  composer: "off" | "lite" | "full"; // PostFX stack (see fx/PostFX.tsx)
  shadowMapSize: number;
  dpr: [number, number];
  nebulaOctaves: number;
  baseFov: number; // vertical FOV at 16:9 — fovForAspect widens it for portrait
  props: { balls: number; kibble: number; mugs: number };
  labelScale: number; // canvas-signage supersampling (fx/labels.ts)
}

const PROFILES: Record<Tier, DeviceProfile> = {
  phone: {
    catCount: 10,
    fuzzShells: false,
    physicalCatMat: false,
    catShadows: false,
    composer: "off",
    shadowMapSize: 1024,
    dpr: [1, 1.5],
    nebulaOctaves: 3,
    baseFov: 70,
    props: { balls: 6, kibble: 5, mugs: 2 },
    labelScale: 1,
  },
  tablet: {
    catCount: 16,
    fuzzShells: true,
    physicalCatMat: true,
    catShadows: true,
    composer: "lite", // bloom + vignette; the neon finally ignites on iPads
    shadowMapSize: 2048,
    dpr: [1, 2],
    nebulaOctaves: 4,
    baseFov: 60,
    props: { balls: 10, kibble: 8, mugs: 3 },
    labelScale: 2,
  },
  desktop: {
    catCount: 16,
    fuzzShells: true,
    physicalCatMat: true,
    catShadows: true,
    composer: "full",
    shadowMapSize: 2048,
    dpr: [1, 2],
    nebulaOctaves: 4,
    baseFov: 55,
    props: { balls: 10, kibble: 8, mugs: 3 },
    labelScale: 2,
  },
};

export const PROFILE: DeviceProfile = PROFILES[TIER];

// Respect the visitor's motion preference (boot-time snapshot, same as the
// tier). Under reduced motion the gravity dial doesn't auto-breathe and the
// cosmetic camera/laser jitters are stilled — everything the visitor drives
// themselves (scrubbing, touring, playing) still works.
export const REDUCED_MOTION =
  hasWindow && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const REF_ASPECT = 16 / 9;

/** Aspect-compensated vertical FOV. Three.js FOV is VERTICAL, so a value
 *  authored on 16:9 crops to a keyhole on a portrait phone (55° vertical ≈
 *  28° horizontal at aspect 0.48). Below the reference aspect, widen the
 *  vertical FOV so the HORIZONTAL field matches what `baseV` gives at 16:9
 *  (continuous at the reference — no threshold pop), clamped to 95° so
 *  extreme portrait doesn't fisheye. */
export function fovForAspect(baseV: number, aspect: number): number {
  if (!(aspect < REF_ASPECT)) return baseV;
  const hRef = 2 * Math.atan(Math.tan((baseV * Math.PI) / 360) * REF_ASPECT);
  const v = 2 * Math.atan(Math.tan(hRef / 2) / aspect);
  return Math.min(95, (v * 180) / Math.PI);
}

// Dev affordance, same pattern as __meowGravity: assert the tier from tests.
if (hasWindow) {
  (window as unknown as Record<string, unknown>).__meowDevice = {
    tier: TIER,
    inputTouch: INPUT_TOUCH,
    profile: PROFILE,
  };
}
