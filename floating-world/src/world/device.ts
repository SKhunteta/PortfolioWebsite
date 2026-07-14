// Device profile, decided once at boot. Two independent axes (the meow-9
// pattern):
//
//   TIER        — the RENDERING budget (phone / tablet / desktop). Every
//                 expensive knob keys off the PROFILE table below; new
//                 expensive effects pick their tier THERE, never ad-hoc.
//   INPUT_TOUCH — the ERGONOMICS axis: fingers need bigger targets and
//                 tap-slop regardless of GPU budget.

export type Tier = "phone" | "tablet" | "desktop";

const hasWindow = typeof window !== "undefined";

function detect(): { tier: Tier; touch: boolean } {
  if (!hasWindow) return { tier: "desktop", touch: false };
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  // iPadOS 13+ masquerades as macOS; with a trackpad it reports a fine
  // pointer but still exposes touch points.
  const iPadMasquerade = navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent);
  const touch = coarse || iPadMasquerade;
  const shortSide = Math.min(window.screen.width, window.screen.height);
  const auto: Tier = !touch ? "desktop" : shortSide >= 600 ? "tablet" : "phone";
  const forced = new URLSearchParams(window.location.search).get("tier");
  const tier: Tier =
    forced === "phone" || forced === "tablet" || forced === "desktop" ? forced : auto;
  return { tier, touch };
}

const d = detect();
export const TIER: Tier = d.tier;
export const INPUT_TOUCH = d.touch;

export interface DeviceProfile {
  dpr: [number, number];
  composer: "off" | "lite" | "full"; // fx/Composer.tsx stacks
  trailSeconds: number; // position-history window per train (length ∝ speed)
  trailSegments: number; // ring-buffer samples per train
  baseFov: number; // vertical FOV at 16:9 — fovForAspect widens for portrait
  noiseOctaves: number; // watercolor fbm octaves (shader ALU budget)
  // Small screens undersample the basemap's thin strokes (a 60 m road is
  // subpixel at drift distance in a 390 px viewport) — lift the wash so the
  // painted city survives the resample.
  washBoost: number;
  // The screen-space rain/snow hatch (fx/WeatherOverlay.tsx): one full-screen
  // noise pass. Phones keep weather in the palette + wet paper only.
  weatherOverlay: boolean;
  // The landscape layers (map/Forest.tsx, map/Buildings.tsx): each is ONE
  // instanced draw call, but the instance count is fill/geometry budget —
  // phones carry a lighter forest and a smaller town.
  treeCount: number;
  buildingCount: number;
  // Ambient-life counts — each is ONE instanced draw call, count is the
  // fill budget. birdCount: the dawn/dusk flock crossing the Sound
  // (map/Birds.tsx). platformMotes: boarding dabs scattered per station on
  // dwell (stations/PlatformLife.tsx) — the pool is stations × this.
  birdCount: number;
  platformMotes: number;
  // Burke-Gilman riders (map/Cyclists.tsx) — ONE instanced draw call, count is
  // how many hero figures ride the trail at once.
  cyclistCount: number;
}

const PROFILES: Record<Tier, DeviceProfile> = {
  phone: {
    dpr: [1, 1.5],
    composer: "off", // the painted sprite glow carries the look
    trailSeconds: 30,
    trailSegments: 24,
    baseFov: 52,
    noiseOctaves: 2,
    washBoost: 1.6,
    weatherOverlay: false,
    treeCount: 5000,
    buildingCount: 2200,
    birdCount: 9,
    platformMotes: 4,
    cyclistCount: 3,
  },
  tablet: {
    dpr: [1, 2],
    composer: "lite", // bloom + vignette
    trailSeconds: 40,
    trailSegments: 48,
    baseFov: 48,
    noiseOctaves: 3,
    washBoost: 1.15,
    weatherOverlay: true,
    treeCount: 11000,
    buildingCount: 4000,
    birdCount: 13,
    platformMotes: 6,
    cyclistCount: 4,
  },
  desktop: {
    dpr: [1, 2],
    composer: "full", // bloom + vignette + grain
    trailSeconds: 45,
    trailSegments: 96,
    baseFov: 46,
    noiseOctaves: 3,
    washBoost: 1.0,
    weatherOverlay: true,
    treeCount: 18000,
    buildingCount: 6500,
    birdCount: 16,
    platformMotes: 8,
    cyclistCount: 5,
  },
};

export const PROFILE = PROFILES[TIER];

// Desktop fill-rate guard — the reason the piece can feel effortless on a
// phone yet lag on a powerful desktop. The full-composer desktop path
// (bloom mipmap chain + 4× MSAA + grain) is fill-rate bound: cost scales
// with the backing store = viewport × devicePixelRatio². On a Retina laptop
// or a HiDPI / display-scaled monitor devicePixelRatio is 2, so a large
// window renders ~10–30× the pixels of a phone through a far heavier
// pipeline. The blanket [1, 2] tier value never bounded that. Cap the
// desktop backing store to a device-pixel budget computed from the real
// viewport, so big HiDPI viewports drop to an effective dpr below 2 while
// modest windows keep the full 2×. Floor at 1 — never soften below native
// CSS resolution, the crisp sumi ink outlines depend on it. Decided once at
// boot like the rest of PROFILE.
const DESKTOP_PIXEL_BUDGET = 3_500_000;

function desktopDprCap(): number {
  if (!hasWindow) return 2;
  const vw = window.innerWidth || 1440;
  const vh = window.innerHeight || 900;
  const budgetDpr = Math.sqrt(DESKTOP_PIXEL_BUDGET / (vw * vh));
  return Math.max(1, Math.min(2, budgetDpr));
}

if (TIER === "desktop") {
  // R3F reads the tuple as a range and clamps devicePixelRatio into it, so a
  // non-Retina desktop (dpr 1) is untouched; only 2× displays get pulled down.
  PROFILE.dpr = [1, desktopDprCap()];
}

const REF_ASPECT = 16 / 9;

/** three.js FOV is vertical: a value authored at 16:9 crops portrait phones
 *  to a keyhole. Below the reference aspect, widen the vertical PART of the
 *  way toward holding the horizontal field. Holding it fully hit the old
 *  95° cap on phones — a fisheye that shoved the whole city into a band at
 *  the horizon. The portrait camera framing (CameraRig) now does the rest
 *  of the work by looking more top-down instead. */
export function fovForAspect(baseV: number, aspect: number): number {
  if (!(aspect < REF_ASPECT)) return baseV;
  const hRef = 2 * Math.atan(Math.tan((baseV * Math.PI) / 360) * REF_ASPECT);
  const vFull = ((2 * Math.atan(Math.tan(hRef / 2) / aspect)) * 180) / Math.PI;
  return Math.min(72, baseV + (vFull - baseV) * 0.5);
}
