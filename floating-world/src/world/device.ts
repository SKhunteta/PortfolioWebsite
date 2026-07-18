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
  // The twilight crow commute streaming to the Bothell roost (map/Crows.tsx)
  // — ONE instanced draw call, hidden outside the twilight windows; the count
  // is how thick the river reads.
  crowCount: number;
  platformMotes: number;
  // Deep-platform crowd for the underground halls (stations/UndergroundLife.tsx)
  // — ONE instanced draw call, the pool is (underground stations) × this. The
  // art frescoes beside it are a fixed 8 instances on every tier.
  undergroundMotes: number;
  // Burke-Gilman riders (map/Cyclists.tsx) — ONE instanced draw call, count is
  // how many hero figures ride the trail at once.
  cyclistCount: number;
  // Green Lake loop riders (map/Cyclists.tsx) — the same instanced draw call,
  // circling the lake's famous path instead of the linear rail-trail.
  greenLakeCyclistCount: number;
  // Street cars (map/Cars.tsx) — ONE instanced draw call; count is the size of
  // the fleet distributed across the road network (the real Seattle hour thins
  // how many are visible). Fill/JS-pose budget, so it scales with the tier.
  carCount: number;
  // Cherry-blossom canopies (map/Sakura.tsx) — ONE instanced draw call,
  // clustered at the real bloom sites (UW Quad, the Arboretum, Green Lake,
  // Seward Park). Only visible in bloom season; the count is the fill budget.
  sakuraCount: number;
  // Ferry deck life (map/FerryDeck.tsx) — the close-zoom reveal that turns each
  // toy ferry into a vessel: passengers per boat along the promenade rail (one
  // always at the bow, each with a breath puff on cold days) and parked cars on
  // the deck below. Both are ONE instanced draw call across the small ferry
  // fleet, and hide entirely (zero cost) until the camera zooms in close.
  ferryPassengers: number;
  ferryCars: number;
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
    crowCount: 12,
    platformMotes: 4,
    undergroundMotes: 3,
    cyclistCount: 3,
    greenLakeCyclistCount: 3,
    carCount: 70,
    sakuraCount: 150,
    ferryPassengers: 5,
    ferryCars: 6,
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
    crowCount: 20,
    platformMotes: 6,
    undergroundMotes: 5,
    cyclistCount: 4,
    greenLakeCyclistCount: 4,
    carCount: 130,
    sakuraCount: 260,
    ferryPassengers: 6,
    ferryCars: 8,
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
    crowCount: 28,
    platformMotes: 8,
    undergroundMotes: 7,
    cyclistCount: 5,
    greenLakeCyclistCount: 6,
    carCount: 190,
    sakuraCount: 360,
    ferryPassengers: 7,
    ferryCars: 10,
  },
};

export const PROFILE = PROFILES[TIER];

// Composer fill-rate guard — the reason the piece can feel effortless on a
// phone yet strain on a powerful desktop or iPad. Both composer tiers
// (bloom mipmap chain + FXAA (+ grain on desktop), all on a half-float
// buffer) are fill-rate and GPU-memory bound: cost scales with the backing
// store = viewport × devicePixelRatio². On a Retina laptop, a HiDPI /
// display-scaled monitor, or any modern iPad devicePixelRatio is 2, so a
// large viewport renders ~10–30× the pixels of a phone through a far
// heavier pipeline (a 13" iPad Pro at dpr 2 is a 5.7 M-pixel RGBA16F chain —
// the heaviest config the app could produce, and the one the Jul 16 black
// flicker was recorded on). The blanket [1, 2] tier value never bounded
// that. Cap the composer tiers' backing store to a device-pixel budget
// computed from the real viewport, so big HiDPI viewports drop to an
// effective dpr below 2 while modest windows keep the full 2×. Floor at 1 —
// never soften below native CSS resolution, the crisp sumi ink outlines
// depend on it. Decided once at boot like the rest of PROFILE. The phone
// tier keeps its own [1, 1.5] — no composer, nothing to guard.
const COMPOSER_PIXEL_BUDGET = 3_500_000;

function composerDprCap(): number {
  if (!hasWindow) return 2;
  const vw = window.innerWidth || 1440;
  const vh = window.innerHeight || 900;
  const budgetDpr = Math.sqrt(COMPOSER_PIXEL_BUDGET / (vw * vh));
  return Math.max(1, Math.min(2, budgetDpr));
}

if (PROFILE.composer !== "off") {
  // R3F reads the tuple as a range and clamps devicePixelRatio into it, so a
  // non-Retina desktop (dpr 1) is untouched; only 2× displays get pulled down.
  PROFILE.dpr = [1, composerDprCap()];
}

// ---- ?fx= debug pass toggles (fx/Composer.tsx consumes these) --------------
// Bisect the post chain on real hardware — headless SwiftShader has passed
// every historically broken composer config, so the only trustworthy flicker
// bisect is a human eye on a real GPU. ?fx=-grain,-bloom disables passes;
// ?fx=+grain force-enables one off its tier (e.g. grain on tablet). Debug-only,
// decided once at boot like ?tier=.
export type FxPass = "fxaa" | "bloom" | "grain" | "vignette";

const FX_OVERRIDES = new Map<FxPass, boolean>();
if (hasWindow) {
  const raw = new URLSearchParams(window.location.search).get("fx") ?? "";
  for (const tok of raw.split(",")) {
    const m = /^([+-])(fxaa|bloom|grain|vignette)$/.exec(tok.trim());
    if (m) FX_OVERRIDES.set(m[2] as FxPass, m[1] === "+");
  }
}

/** The tier's default for a pass, unless a ?fx= override flips it. */
export function fxEnabled(pass: FxPass, tierDefault: boolean): boolean {
  return FX_OVERRIDES.get(pass) ?? tierDefault;
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
