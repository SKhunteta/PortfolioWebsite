/** Weather contract mapping and staleness — pure logic, no network. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { precipMmH, isWeatherStale, toWeatherPayload } from "../services/weather.js";

const NOW = Date.UTC(2026, 6, 15, 15, 30, 0);

test("precipitation slice converts to mm/h", () => {
  assert.equal(precipMmH({ precipitation: 0 }), 0);
  assert.equal(precipMmH({ precipitation: 0.5 }), 2); // 0.5 mm / 15 min
  // Falls back to summing components when the total is missing.
  assert.equal(precipMmH({ rain: 0.2, showers: 0.1, snowfall: 0 }), 1.2000000000000002);
});

test("unusable payloads map to null, never a guess", () => {
  assert.equal(precipMmH(null), null);
  assert.equal(precipMmH({}), 0); // components absent -> honestly dry
  assert.equal(precipMmH({ precipitation: -1 }), null);
  assert.equal(precipMmH({ precipitation: NaN }), null);
  assert.equal(toWeatherPayload(undefined, NOW), null);
});

test("contract payload shape", () => {
  const w = toWeatherPayload({ precipitation: 0.75, weather_code: 61 }, NOW);
  assert.deepEqual(w, {
    precipMmH: 3,
    weatherCode: 61,
    fetchedAt: new Date(NOW).toISOString(),
  });
  const noCode = toWeatherPayload({ precipitation: 0 }, NOW);
  assert.equal(noCode.weatherCode, null);
});

test("weather staleness thresholds", () => {
  assert.equal(isWeatherStale(NOW - 10 * 60 * 1000, NOW), false);
  assert.equal(isWeatherStale(NOW - 31 * 60 * 1000, NOW), true);
  assert.equal(isWeatherStale(0, NOW), true);
  assert.equal(isWeatherStale(undefined, NOW), true);
});
