// Real Seattle weather drives the paper, the same way the real sun drives
// the palette (world/sun.ts). Open-Meteo's current conditions (no key, CORS
// open) are fetched every ten minutes and classified into a handful of
// watercolor moves: rain darkens the washes and blooms pigment along the
// shorelines, fog thickens until the horizon landmarks dissolve, snow dusts
// the whole map pale. Honesty is part of the art here too — the HUD only
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
}

const LEVELS: Record<WeatherKind, Levels> = {
  clear: { rain: 0, snow: 0, fog: 0, overcast: 0 },
  cloudy: { rain: 0, snow: 0, fog: 0, overcast: 0.8 },
  fog: { rain: 0, snow: 0, fog: 1, overcast: 0.5 },
  drizzle: { rain: 0.4, snow: 0, fog: 0.25, overcast: 0.7 },
  rain: { rain: 0.8, snow: 0, fog: 0.15, overcast: 0.9 },
  storm: { rain: 1, snow: 0, fog: 0.2, overcast: 1 },
  snow: { rain: 0, snow: 1, fog: 0.3, overcast: 0.7 },
};

/** Eased live values — read by shaders and the overlay every frame. */
export const WEATHER: Levels = { rain: 0, snow: 0, fog: 0, overcast: 0 };

const target: Levels = { rain: 0, snow: 0, fog: 0, overcast: 0 };

// Marine warmth (#14): a 0..1 read of the REAL air temperature — the season and
// warm-water proxy that gates the Sound's bioluminescent shimmer. Honest like
// the rest: 0 until a real fetch succeeds, so a blocked feed never invents a
// warm night. Eased alongside the weather levels.
export const MARINE = { warmth: 0 };
let warmthTarget = 0;

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

function setKind(kind: WeatherKind) {
  Object.assign(target, LEVELS[kind]);
  useWeather.setState({ kind, label: LABELS[kind] ?? null });
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

export function setWeatherOverride(kind: WeatherKind | null) {
  override = kind && KINDS.includes(kind) ? kind : null;
  if (override) setKind(override);
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
    lastFetched = classify(
      code,
      json.current?.cloud_cover ?? 0,
      isConvective(json.hourly, Date.now())
    );
    lastFetchAt = Date.now();
    // Warm Puget Sound nights (~15 °C air and up) are when the dinoflagellates
    // bloom; map the real temperature into the biolum gate.
    const temp = json.current?.temperature_2m;
    if (typeof temp === "number") warmthTarget = Math.max(0, Math.min(1, (temp - 12) / 10));
    if (!override) setKind(lastFetched);
  } catch {
    // Offline / blocked: keep whatever we last knew. Never invent weather.
  }
}

/** Kick off the ten-minute weather poll. Returns a stop function. */
export function startWeather(): () => void {
  if (override) setKind(override);
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

// --- per-frame -------------------------------------------------------------

const EASE_TAU_S = 8; // a shower arrives like a wash (~8 s time constant)

/** Ease live levels toward the fetched target. Single driver only. */
export function easeWeather(dt: number) {
  const k = 1 - Math.exp(-dt / EASE_TAU_S);
  WEATHER.rain += (target.rain - WEATHER.rain) * k;
  WEATHER.snow += (target.snow - WEATHER.snow) * k;
  WEATHER.fog += (target.fog - WEATHER.fog) * k;
  WEATHER.overcast += (target.overcast - WEATHER.overcast) * k;
  MARINE.warmth += (warmthTarget - MARINE.warmth) * k;
}

// Scratch colors for the snow/fog lerps — never handed to materials.
const SNOW_PAPER = new THREE.Color("#8fa2b8");
const SNOW_PARK = new THREE.Color("#a7b6c8");
const FOG_PALE = new THREE.Color("#33445c");

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
  const dim = 1 - 0.07 * w.overcast - 0.09 * w.rain;
  LIVE.ground.multiplyScalar(dim);
  LIVE.paperTint.multiplyScalar(dim);
  LIVE.background.multiplyScalar(1 - 0.05 * w.overcast - 0.06 * w.rain);

  // Wet streets catch the gold filaments at night.
  LIVE.roadIntensity *= 1 + 0.35 * w.rain * (1 - sunPhase);

  // Snow: the rare day the whole map goes pale — washes buried, edges cool.
  if (w.snow > 0.001) {
    LIVE.ground.lerp(SNOW_PAPER, w.snow * 0.42);
    LIVE.paperTint.lerp(SNOW_PAPER, w.snow * 0.32);
    LIVE.park.lerp(SNOW_PARK, w.snow * 0.55);
    LIVE.groundOpacity = Math.min(1, LIVE.groundOpacity + 0.12 * w.snow);
  }
}
