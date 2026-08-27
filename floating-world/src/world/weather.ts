// Real Seattle weather drives the paper, the same way the real sun drives
// the palette (world/sun.ts). Open-Meteo's current conditions (no key, CORS
// open) are fetched every ten minutes and classified into a handful of
// watercolor moves: rain darkens the washes and blooms pigment along the
// shorelines, fog thickens until the horizon landmarks dissolve, snow
// blankets the whole city pale under a heavy snow-grey sky. Honesty is part
// of the art here too — the HUD only
// speaks a weather word after a real fetch succeeds, and if the fetch fails
// the paper simply stays dry: no claim, no fake drizzle.
//
// Two-speed state, matching the palette pattern:
//   target  — set on fetch (rare)
//   WEATHER — eased toward target once per frame by the single driver
//             (Trains.tsx), so a shower arrives like a wash, not a switch.
// applyWeather() runs AFTER updatePalette() each frame and modulates LIVE in
// place — updatePalette rewrites LIVE from NIGHT/DAY every frame, so these
// multiplies never accumulate.
//
// ?weather=clear|cloudy|fog|drizzle|rain|storm|snow pins it for demos and
// tests, like ?phase pins the sun.

import * as THREE from "three";
import { create } from "zustand";
import { LIVE } from "./palettes";
import { CLOCK } from "./clock";

export type WeatherKind =
  | "clear"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "storm"
  | "snow";

interface Levels {
  rain: number; // 0..1 — hatch density, wet-paper darkening
  snow: number; // 0..1 — pale dusting + drifting flakes
  fog: number; // 0..1 — extra fog density, landmark dissolve
  overcast: number; // 0..1 — a general dimming of the page
  lightning: number; // 0..1 — storm only: the page flashes, the bolt is carved
}

const LEVELS: Record<WeatherKind, Levels> = {
  clear: { rain: 0, snow: 0, fog: 0, overcast: 0, lightning: 0 },
  cloudy: { rain: 0, snow: 0, fog: 0, overcast: 0.8, lightning: 0 },
  fog: { rain: 0, snow: 0, fog: 1, overcast: 0.5, lightning: 0 },
  drizzle: { rain: 0.4, snow: 0, fog: 0.25, overcast: 0.7, lightning: 0 },
  rain: { rain: 0.8, snow: 0, fog: 0.15, overcast: 0.9, lightning: 0 },
  storm: { rain: 1, snow: 0, fog: 0.2, overcast: 1, lightning: 1 },
  snow: { rain: 0, snow: 1, fog: 0.3, overcast: 0.7, lightning: 0 },
};

/** Eased live values — read by shaders and the overlay every frame. */
export const WEATHER: Levels = { rain: 0, snow: 0, fog: 0, overcast: 0, lightning: 0 };

const target: Levels = { rain: 0, snow: 0, fog: 0, overcast: 0, lightning: 0 };

// What the HUD whispers. Only rain/fog/snow speak; clear and cloudy stay
// silent — the palette already says everything a gray day needs to.
const LABELS: Partial<Record<WeatherKind, string>> = {
  fog: "fog on the sound",
  drizzle: "drizzle over the city",
  rain: "rain over the city",
  storm: "storm over the city",
  snow: "snow over the city",
};

interface WeatherUi {
  kind: WeatherKind | null; // null until we truly know
  label: string | null;
}

export const useWeather = create<WeatherUi>(() => ({ kind: null, label: null }));

// byHand: a runtime pin (the HUD's sky dial, __linkMap.setWeather) marks the
// word so a painted storm never claims to be the real one — honesty holds even
// mid-demonstration. URL pins skip the mark: they exist for screenshots and
// the smoke harness, where the suffix would only churn fixtures.
function setKind(kind: WeatherKind, byHand = false) {
  Object.assign(target, LEVELS[kind]);
  const base = LABELS[kind] ?? null;
  useWeather.setState({ kind, label: byHand && base ? `${base} · by hand` : base });
}

/** WMO weather codes (Open-Meteo's `weather_code`) → our watercolor kinds.
 * `convective` upgrades falling rain to a storm: outside Central Europe most
 * of the models behind Open-Meteo never speak the thunderstorm codes (95+)
 * in the `current` block, so a real thunderstorm over Seattle usually
 * arrives labeled "showers". The thunder evidence lives in the hourly
 * series instead (isConvective below) — rain that is actually falling plus
 * a convective hour is a storm, honestly observed, not invented. */
function classify(code: number, cloudCover: number, convective = false): WeatherKind {
  if (code === 45 || code === 48) return "fog";
  if ((code >= 51 && code <= 57) || code === 80) return convective ? "storm" : "drizzle";
  if ((code >= 61 && code <= 63) || code === 81) return convective ? "storm" : "rain";
  if ((code >= 65 && code <= 67) || code === 82) return "storm";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return cloudCover > 55 ? "cloudy" : "clear";
}

interface HourlySeries {
  time?: number[]; // unix seconds, hour starts (timeformat=unixtime)
  weather_code?: number[];
  cape?: number[];
}

// Seattle thunderstorms are low-CAPE affairs — a few hundred J/kg where the
// plains see thousands — while the stable marine drizzle sits near zero.
// 350 J/kg with rain already falling is convection worth calling a storm.
const CAPE_STORM_JKG = 350;

/** Thunder evidence for the hour we're in (or the one about to arrive):
 * an hourly thunderstorm code, or enough convective energy to make one. */
function isConvective(hourly: HourlySeries | undefined, nowMs: number): boolean {
  const times = hourly?.time;
  if (!times?.length) return false;
  const nowS = nowMs / 1000;
  const i = times.findIndex((t) => nowS >= t && nowS < t + 3600);
  if (i < 0) return false;
  for (const j of [i, i + 1]) {
    const code = hourly?.weather_code?.[j];
    if (typeof code === "number" && code >= 95) return true;
    const cape = hourly?.cape?.[j];
    if (typeof cape === "number" && cape >= CAPE_STORM_JKG) return true;
  }
  return false;
}

// --- override (?weather= / __linkMap.setWeather) --------------------------

const KINDS: WeatherKind[] = ["clear", "cloudy", "fog", "drizzle", "rain", "storm", "snow"];

function parseOverride(): WeatherKind | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("weather");
  return raw && (KINDS as string[]).includes(raw) ? (raw as WeatherKind) : null;
}

let override: WeatherKind | null = parseOverride();

/** The active pin, if any — the HUD's sky dial reads it to start pinned when
 * the page loaded with ?weather=. */
export function weatherOverride(): WeatherKind | null {
  return override;
}

export function setWeatherOverride(kind: WeatherKind | null) {
  override = kind && KINDS.includes(kind) ? kind : null;
  if (override) setKind(override, true);
  else if (lastFetched) setKind(lastFetched);
  else {
    Object.assign(target, LEVELS.clear);
    useWeather.setState({ kind: null, label: null });
  }
}

// --- fetch -----------------------------------------------------------------

const URL_CURRENT =
  "https://api.open-meteo.com/v1/forecast?latitude=47.6062&longitude=-122.3321" +
  "&current=weather_code,cloud_cover,temperature_2m";
// The hourly block carries the thunder evidence (isConvective above).
const URL_HOURLY = "&hourly=weather_code,cape&forecast_days=1&timeformat=unixtime";
const FETCH_EVERY_MS = 10 * 60_000;

let lastFetched: WeatherKind | null = null;
let lastFetchAt = 0;

async function fetchWeather() {
  try {
    // If the enriched query is ever rejected (an upstream variable rename),
    // fall back to bare current conditions rather than losing weather whole.
    let res = await fetch(URL_CURRENT + URL_HOURLY);
    if (!res.ok) res = await fetch(URL_CURRENT);
    if (!res.ok) return; // silence is honest — the paper stays as it was
    const json = (await res.json()) as {
      current?: { weather_code?: number; cloud_cover?: number; temperature_2m?: number };
      hourly?: HourlySeries;
    };
    const code = json.current?.weather_code;
    if (typeof code !== "number") return;
    // Coldness for the breath (below): a real air temperature, ramped from
    // "sweater weather" to "you can see your breath". If the temp field is
    // missing we keep whatever we last knew — never invent a cold day.
    const tempC = json.current?.temperature_2m;
    if (typeof tempC === "number") coldFromTemp = coldnessAtC(tempC);
    lastFetched = classify(
      code,
      json.current?.cloud_cover ?? 0,
      isConvective(json.hourly, Date.now())
    );
    lastFetchAt = Date.now();
    if (!override) setKind(lastFetched);
  } catch {
    // Offline / blocked: keep whatever we last knew. Never invent weather.
  }
}

/** Kick off the ten-minute weather poll. Returns a stop function. */
export function startWeather(): () => void {
  if (override) {
    setKind(override);
    // A URL pin is for demos and tests: start IN the pinned weather rather
    // than easing into it from a dry page. Runtime changes still wash in.
    Object.assign(WEATHER, LEVELS[override]);
  }
  // A URL cold pin (?cold=) starts IN the cold, same as the weather pin — the
  // breath is up from the first frame instead of easing in over ~8 s.
  if (coldOverride != null) COLD.level = coldOverride;
  void fetchWeather();
  const id = setInterval(() => {
    if (!document.hidden) void fetchWeather();
  }, FETCH_EVERY_MS);
  // A tab that slept through its poll catches up the moment it returns.
  const onVisible = () => {
    if (!document.hidden && Date.now() - lastFetchAt > FETCH_EVERY_MS) void fetchWeather();
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    clearInterval(id);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

// --- cold (the visible-breath signal) --------------------------------------
// A real air temperature, kept as an eased 0..1 "coldness" the same two-speed
// way the weather levels are: a rare Seattle cold snap slides in, it doesn't
// snap on. Read by the ferry deck (map/FerryDeck.tsx) to puff the passengers'
// breath on cold days, and honest like the rest — it only reads a real fetched
// temperature (or a snow day, which is cold by definition), never a guess.
//
// The ramp: no breath above ~10 °C, full plume by ~1 °C (with a snow day as a
// floor, since it is cold whatever the thermometer says).
const BREATH_WARM_C = 10;
const BREATH_COLD_C = 1;

export function coldnessAtC(tempC: number): number {
  const t = (BREATH_WARM_C - tempC) / (BREATH_WARM_C - BREATH_COLD_C);
  return Math.max(0, Math.min(1, t));
}

/** Eased 0..1 coldness — read by shaders every frame (like WEATHER). */
export const COLD = { level: 0 };

let coldFromTemp = 0; // 0..1 from the last real temperature fetch

function parseColdOverride(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("cold");
  if (raw == null) return null;
  if (raw === "on") return 1;
  if (raw === "off") return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null;
}

let coldOverride: number | null = parseColdOverride();

/** ?cold=0..1|on|off / __linkMap.setCold — pin the breath on for demos/tests.
 *  A pin SNAPS the live level (like the weather URL pin starts in its weather),
 *  so a screenshot/test doesn't wait out the ease; real temperature still eases. */
export function setColdOverride(level: number | null) {
  coldOverride = level == null ? null : Math.max(0, Math.min(1, level));
  if (coldOverride != null) COLD.level = coldOverride;
}

// --- lightning ---------------------------------------------------------------
// Hokusai's storm move (Sanka Hakuu — the red bolt at Fuji's flank): when a
// real storm sits over the city, the sheet flashes pale for an instant and a
// carved bolt cracks down the print (fx/WeatherOverlay.tsx draws it). Strikes
// are scheduled deterministically from the shared clock — a hash of the strike
// index, never Math.random on the frame path — so the smoke harness and two
// side-by-side tabs see the same storm.

export const LIGHTNING = {
  flash: 0, // 0..1 page-flash envelope — applyWeather lifts the palette by it
  bolt: 0, // 0..1 bolt-ink envelope — sharper attack, lingers a beat longer
  seed: 0, // 0..1 per-strike hash: where the bolt falls, how it zigzags
  strikeId: 0, // increments on each strike (the audio engine listens for the edge)
};

const strikeHash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};

let nextStrikeT = -1;
let strikeT = -Infinity;
let strikeN = 0;

// Screenshot/demo pin (the reelAt precedent): hold a bolt fully lit at a
// chosen seed so the smoke harness can catch the strike without racing the
// ~0.2 s envelope. __linkMap.strike(seed) sets it; strike(null) releases.
let strikePin: number | null = null;

export function setStrikePin(seed: number | null) {
  strikePin = seed;
  if (seed != null) LIGHTNING.seed = seed - Math.floor(seed);
}

function tickLightning(t: number) {
  if (strikePin != null) {
    LIGHTNING.flash = 0.8;
    LIGHTNING.bolt = 1;
    return;
  }
  const gate = WEATHER.lightning;
  if (gate < 0.05) {
    LIGHTNING.flash = 0;
    LIGHTNING.bolt = 0;
    nextStrikeT = -1; // the next storm opens with its own first strike
    return;
  }
  if (nextStrikeT < 0) nextStrikeT = t + 2 + strikeHash(strikeN + 0.7) * 6;
  if (t >= nextStrikeT) {
    strikeT = t;
    strikeN++;
    LIGHTNING.seed = strikeHash(strikeN);
    LIGHTNING.strikeId = strikeN;
    nextStrikeT = t + 7 + strikeHash(strikeN + 0.31) * 15; // one every ~7–22 s
  }
  const age = t - strikeT;
  // Double flicker: the main discharge and a fainter return stroke ~0.2 s on.
  const main = Math.exp(-age * 9);
  const echo = 0.5 * Math.exp(-Math.pow((age - 0.22) * 9, 2));
  const flash = (main + echo) * gate;
  LIGHTNING.flash = flash < 0.003 ? 0 : Math.min(1, flash);
  const bolt = Math.exp(-age * 5.5) * gate;
  LIGHTNING.bolt = bolt < 0.003 ? 0 : Math.min(1, bolt);
}

// --- per-frame -------------------------------------------------------------

const EASE_TAU_S = 8; // a shower arrives like a wash (~8 s time constant)

/** Ease live levels toward the fetched target. Single driver only. */
export function easeWeather(dt: number) {
  const k = 1 - Math.exp(-dt / EASE_TAU_S);
  WEATHER.rain += (target.rain - WEATHER.rain) * k;
  WEATHER.snow += (target.snow - WEATHER.snow) * k;
  WEATHER.fog += (target.fog - WEATHER.fog) * k;
  WEATHER.overcast += (target.overcast - WEATHER.overcast) * k;
  WEATHER.lightning += (target.lightning - WEATHER.lightning) * k;
  // Coldness eases the same way. A snow day is cold whatever the thermometer
  // last said, so the eased snow target floors it; a URL/console pin overrides.
  const coldTarget = coldOverride != null ? coldOverride : Math.max(coldFromTemp, target.snow);
  COLD.level += (coldTarget - COLD.level) * k;
  tickLightning(CLOCK.t);
}

// Scratch colors for the snow/fog lerps — never handed to materials.
// Warm register: snow blankets the print warm-pale and fog is kasumi
// (paper-toned mist), never slate — cool greys would break the woodblock.
// All under the bright-paper ceiling (~#f2): a snowfield, never a bloom.
const SNOW_PAPER = new THREE.Color("#f0ebdd");
const SNOW_PARK = new THREE.Color("#f1ecdf");
// The heavy snow sky — a warm grey the cream sheet sinks into so the white
// flakes and the capped roofs read against it (Hiroshige's Kanbara move:
// darken the sky, reserve the snow).
const SNOW_SKY = new THREE.Color("#d6cfc0");
const FOG_PALE = new THREE.Color("#e6d6ae");
// The flash lifts toward pale washi, NOT white — the bright-paper bloom rule
// binds even lightning (every channel stays under ~#f2, only painted-HDR
// sources ever ignite the composer).
const FLASH_PAPER = new THREE.Color("#efe7cd");

/**
 * Modulate the LIVE palette with the eased weather. MUST run right after
 * updatePalette() (which rebuilds LIVE from NIGHT/DAY) — these are relative
 * moves on that fresh frame, so nothing drifts or accumulates.
 */
export function applyWeather(sunPhase: number) {
  const w = WEATHER;
  if (w.rain + w.snow + w.fog + w.overcast < 0.004) return; // dry page, untouched

  const wet = Math.max(w.rain, w.snow * 0.7);

  // Fog you can feel: the horizon (Rainier, the Olympics) dissolves first.
  LIVE.fogDensity += w.fog * 0.014 + w.rain * 0.0035 + w.snow * 0.005;
  LIVE.landmarkOpacity *= 1 - 0.42 * w.fog - 0.12 * w.rain;
  if (w.fog > 0) LIVE.fog.lerp(FOG_PALE, w.fog * 0.3);

  // Wet paper: pigment pools along the shorelines, washes deepen, the tooth
  // of the page shows through the standing water.
  LIVE.waterEdgeIntensity *= 1 + 0.85 * wet;
  LIVE.paperGrain *= 1 + 0.4 * w.rain;
  // A grey day has to work harder against bright washi than it did against
  // link-map's night city — deeper dim so overcast actually reads.
  const dim = 1 - 0.14 * w.overcast - 0.14 * w.rain;
  LIVE.ground.multiplyScalar(dim);
  LIVE.paperTint.multiplyScalar(dim);
  LIVE.background.multiplyScalar(1 - 0.06 * w.overcast - 0.08 * w.rain);

  // Wet streets catch the gold filaments at night.
  LIVE.roadIntensity *= 1 + 0.35 * w.rain * (1 - sunPhase);

  // Snow: the rare day the whole city goes under the blanket. Washes bury,
  // the town's roofs cap white, the evergreens flock, the sumi streets
  // soften to tracks in the snow, and the sky sinks to a heavy snow-grey so
  // every white mark reads in reserve against it. After dark the blanket
  // DIMS with the print instead of erasing it — a moonlit snowfield under
  // the lantern look, never a second daylight: the lerps ease off toward
  // night and the sky holds its aubergine.
  if (w.snow > 0.001) {
    const s = w.snow * (0.45 + 0.55 * sunPhase);
    LIVE.ground.lerp(SNOW_PAPER, s * 0.68);
    LIVE.paperTint.lerp(SNOW_PAPER, s * 0.55);
    LIVE.park.lerp(SNOW_PARK, s * 0.8);
    LIVE.tree.lerp(SNOW_PARK, s * 0.45);
    LIVE.building.lerp(SNOW_PAPER, s * 0.3);
    LIVE.buildingRoofA.lerp(SNOW_PAPER, s * 0.75);
    LIVE.buildingRoofB.lerp(SNOW_PAPER, s * 0.75);
    LIVE.buildingRoofC.lerp(SNOW_PAPER, s * 0.75);
    LIVE.landmark.lerp(SNOW_PAPER, s * 0.22);
    // The gold lantern streets stay lit through a night snowfall — burial is
    // a daytime ink-cover move.
    LIVE.roadIntensity *= 1 - 0.45 * w.snow * (0.3 + 0.7 * sunPhase);
    LIVE.background.lerp(SNOW_SKY, w.snow * 0.5 * (0.3 + 0.7 * sunPhase));
    LIVE.groundOpacity = Math.min(1, LIVE.groundOpacity + 0.15 * w.snow);
  }

  // Lightning: for one flickering instant the whole sheet lifts pale and the
  // horizon leaps back out of the storm — the dissolved landmarks reappear in
  // silhouette, the way a night landscape exists only during the flash.
  const flash = LIGHTNING.flash;
  if (flash > 0.003) {
    LIVE.background.lerp(FLASH_PAPER, 0.3 * flash);
    LIVE.ground.lerp(FLASH_PAPER, 0.22 * flash);
    LIVE.paperTint.lerp(FLASH_PAPER, 0.22 * flash);
    LIVE.fog.lerp(FLASH_PAPER, 0.25 * flash);
    LIVE.fogDensity *= 1 - 0.35 * flash;
    LIVE.landmarkOpacity = Math.min(1, LIVE.landmarkOpacity * (1 + 0.3 * flash));
  }
}
