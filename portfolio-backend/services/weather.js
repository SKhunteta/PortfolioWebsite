// Real Seattle weather for The Living Link's rain layer.
//
// Open-Meteo current conditions (no API key), cached well beyond the
// vehicles route's 10s cache — weather moves in minutes, not seconds. The
// contract is honest the same way the mode badge is: a failed or stale
// fetch reports null, and the map simply isn't raining. Never a guess.

const WEATHER_URL =
  process.env.LINK_WEATHER_URL ||
  "https://api.open-meteo.com/v1/forecast?latitude=47.6062&longitude=-122.3321&current=precipitation,rain,showers,snowfall,weather_code";
const UPSTREAM_TIMEOUT_MS = 6 * 1000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const WEATHER_STALE_MS = 30 * 60 * 1000;

// Open-Meteo reports current precipitation in mm over the preceding
// 15-minute slice; ×4 approximates mm/h, the unit the frontend maps to
// visual intensity. rain/showers/snowfall are folded in by `precipitation`
// already — read them only as a fallback for partial payloads.
export function precipMmH(current) {
  if (!current || typeof current !== "object") return null;
  const slice =
    typeof current.precipitation === "number"
      ? current.precipitation
      : (current.rain ?? 0) + (current.showers ?? 0) + (current.snowfall ?? 0);
  if (typeof slice !== "number" || !Number.isFinite(slice) || slice < 0) return null;
  return slice * 4;
}

export function isWeatherStale(fetchedAtMs, nowMs) {
  if (!fetchedAtMs) return true;
  return nowMs - fetchedAtMs > WEATHER_STALE_MS;
}

// Raw Open-Meteo current block -> contract shape (or null when unusable).
export function toWeatherPayload(current, nowMs) {
  const mmH = precipMmH(current);
  if (mmH == null) return null;
  return {
    precipMmH: Math.round(mmH * 100) / 100,
    weatherCode: typeof current.weather_code === "number" ? current.weather_code : null,
    fetchedAt: new Date(nowMs).toISOString(),
  };
}

let cachedWeather = null; // last successful observation
let lastSuccessAt = 0;
let lastAttemptAt = 0; // throttles retries during an outage too
let inflight = null;

async function fetchWeather(nowMs) {
  const res = await fetch(WEATHER_URL, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`weather responded ${res.status}`);
  const body = await res.json();
  return toWeatherPayload(body?.current, nowMs);
}

/** Cached current weather; resolves null (never rejects) on any failure so
 *  the vehicles payload is never delayed or broken by the weather upstream.
 *  A blip rides on the previous observation; a long outage goes honestly
 *  silent instead of reporting hours-old rain. */
export function getSeattleWeather(nowMs = Date.now()) {
  if (lastAttemptAt && nowMs - lastAttemptAt < CACHE_TTL_MS) {
    return Promise.resolve(isWeatherStale(lastSuccessAt, nowMs) ? null : cachedWeather);
  }
  if (inflight) return inflight;
  lastAttemptAt = nowMs;
  inflight = fetchWeather(nowMs)
    .then((weather) => {
      cachedWeather = weather;
      lastSuccessAt = nowMs;
      return weather;
    })
    .catch((err) => {
      console.error("linkmap: weather fetch failed:", err.message);
      return isWeatherStale(lastSuccessAt, nowMs) ? null : cachedWeather;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
