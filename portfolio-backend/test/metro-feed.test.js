/** Metro GTFS-RT trim/staleness and RapidRide detection — no network. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isFeedStale,
  isRapidRideName,
  buildRapidSet,
  extractMetroVehicles,
} from "../services/metroFeed.js";

const NOW = Date.UTC(2026, 6, 15, 15, 30, 0);

const entity = (overrides = {}, vehicleId = "1_4808") => ({
  id: "e1",
  vehicle: {
    trip: { routeId: "1_100252" },
    vehicle: { id: vehicleId },
    position: { latitude: 47.612345678, longitude: -122.334567891, bearing: 172.4 },
    timestamp: Math.floor(NOW / 1000) - 30,
    ...overrides,
  },
});

test("feed staleness thresholds", () => {
  assert.equal(isFeedStale(Math.floor(NOW / 1000) - 60, NOW), false);
  assert.equal(isFeedStale(Math.floor(NOW / 1000) - 6 * 60, NOW), true);
  assert.equal(isFeedStale(undefined, NOW), true);
});

test("RapidRide short names are the A–H lines, nothing else", () => {
  assert.equal(isRapidRideName("E Line"), true);
  assert.equal(isRapidRideName("a line"), true);
  assert.equal(isRapidRideName("H Line "), true);
  assert.equal(isRapidRideName("1 Line"), false); // that's Link
  assert.equal(isRapidRideName("40"), false);
  assert.equal(isRapidRideName("Trailhead Direct"), false);
  assert.equal(isRapidRideName(null), false);
});

test("builds the RapidRide route-id set from the OBA routes payload", () => {
  const set = buildRapidSet({
    data: {
      list: [
        { id: "1_100512", shortName: "E Line" },
        { id: "1_100223", shortName: "A Line" },
        { id: "1_100252", shortName: "40" },
        { id: "1_102548", shortName: "Duvall–Monroe Shuttle" },
      ],
    },
  });
  assert.deepEqual([...set].sort(), ["1_100223", "1_100512"]);
  assert.equal(buildRapidSet(null).size, 0);
  assert.equal(buildRapidSet({}).size, 0);
});

test("trims vehicles to short keys with rounded coords", () => {
  const feed = { entity: [entity()] };
  const out = extractMetroVehicles(feed, NOW);
  assert.equal(out.length, 1);
  const bus = out[0];
  assert.deepEqual(Object.keys(bus).sort(), ["hdg", "id", "lat", "lon", "ts"]);
  assert.equal(bus.id, "1_4808");
  assert.equal(bus.lat, 47.61235); // 5 decimals ≈ 1 m — plenty for a toy
  assert.equal(bus.lon, -122.33457);
  assert.equal(bus.hdg, 172);
});

test("keeps every route (no known-lines filter) and flags RapidRide", () => {
  const feed = {
    entity: [
      entity({}, "1_4808"),
      entity({ trip: { routeId: "1_100512" } }, "1_6222"),
    ],
  };
  const rapid = new Set(["1_100512"]);
  const out = extractMetroVehicles(feed, NOW, rapid);
  assert.equal(out.length, 2);
  assert.equal(out[0].rr, undefined); // absent, not false — wire stays lean
  assert.equal(out[1].rr, 1);
});

test("drops stale, positionless, and non-finite fixes; missing bearing stays missing", () => {
  const feed = {
    entity: [
      entity({ timestamp: Math.floor(NOW / 1000) - 10 * 60 }), // stale
      entity({ position: undefined }), // no fix
      entity({ position: { latitude: NaN, longitude: -122.3 } }), // bad fix
      entity({ position: { latitude: 47.6, longitude: -122.3 } }, "1_7001"), // no bearing
    ],
  };
  const out = extractMetroVehicles(feed, NOW);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "1_7001");
  assert.equal("hdg" in out[0], false);
});

test("a vehicle without its own timestamp inherits the poll time", () => {
  const feed = { entity: [entity({ timestamp: undefined })] };
  const out = extractMetroVehicles(feed, NOW);
  assert.equal(out.length, 1);
  assert.equal(out[0].ts, Math.floor(NOW / 1000));
});
