/** GTFS-RT feed filtering — route matching and staleness, no network. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  matchLineId,
  isFeedStale,
  extractLinkVehicles,
  readOccupancy,
} from "../services/linkFeed.js";

const NOW = Date.UTC(2026, 6, 15, 15, 30, 0);
const KNOWN = ["1LINE", "2LINE"];

const entity = (overrides = {}) => ({
  id: "e1",
  vehicle: {
    trip: { routeId: "40_1LINE" },
    vehicle: { id: "veh-1" },
    position: { latitude: 47.61, longitude: -122.33, bearing: 180 },
    timestamp: Math.floor(NOW / 1000) - 30,
    ...overrides,
  },
});

test("matches agency-prefixed and bare route ids in both directions", () => {
  assert.equal(matchLineId("40_1LINE", KNOWN), "1LINE");
  assert.equal(matchLineId("1LINE", KNOWN), "1LINE");
  assert.equal(matchLineId("2LINE", ["40_2LINE"]), "40_2LINE");
  assert.equal(matchLineId("40_SOUNDER-N", KNOWN), null);
  assert.equal(matchLineId(undefined, KNOWN), null);
});

test("feed staleness thresholds", () => {
  assert.equal(isFeedStale(Math.floor(NOW / 1000) - 60, NOW), false);
  assert.equal(isFeedStale(Math.floor(NOW / 1000) - 6 * 60, NOW), true);
  assert.equal(isFeedStale(undefined, NOW), true);
});

test("extracts Link vehicles and drops non-Link / stale / positionless ones", () => {
  const feed = {
    entity: [
      entity(),
      entity({ trip: { routeId: "40_100479" } }), // not Link
      entity({ timestamp: Math.floor(NOW / 1000) - 10 * 60 }), // stale vehicle
      { id: "e4", vehicle: { trip: { routeId: "40_1LINE" } } }, // no position
      entity({ trip: {} }), // no route id
    ],
  };
  const vehicles = extractLinkVehicles(feed, KNOWN, NOW);
  assert.equal(vehicles.length, 1);
  assert.deepEqual(vehicles[0], {
    id: "veh-1",
    line: "1LINE",
    lat: 47.61,
    lon: -122.33,
    heading: 180,
    timestamp: Math.floor(NOW / 1000) - 30,
  });
});

test("occupancy: percentage wins, else status enum, else null", () => {
  assert.equal(readOccupancy({ occupancyPercentage: 80 }), 0.8);
  assert.equal(readOccupancy({ occupancyPercentage: 250 }), 1); // clamped
  assert.equal(readOccupancy({ occupancyStatus: 0 }), 0.05); // EMPTY
  assert.equal(readOccupancy({ occupancyStatus: 5 }), 1.0); // FULL
  // percentage takes priority over a status when both are present
  assert.equal(readOccupancy({ occupancyPercentage: 30, occupancyStatus: 5 }), 0.3);
  // no ridership signal -> null (client falls back to its ambient estimate)
  assert.equal(readOccupancy({}), null);
  assert.equal(readOccupancy({ occupancyStatus: 7 }), null); // NO_DATA_AVAILABLE
  assert.equal(readOccupancy(undefined), null);
});

test("extracted vehicle carries occupancy only when the feed reports it", () => {
  const feed = {
    entity: [
      entity(), // no occupancy fields
      entity({
        vehicle: { id: "veh-2" },
        trip: { routeId: "40_2LINE" },
        occupancyStatus: 3, // STANDING_ROOM_ONLY
      }),
    ],
  };
  const vehicles = extractLinkVehicles(feed, KNOWN, NOW);
  assert.equal(vehicles.length, 2);
  assert.equal("occupancy" in vehicles[0], false);
  assert.equal(vehicles[1].occupancy, 0.7);
});

test("tolerates protobufjs Long-style timestamps", () => {
  const longLike = { toNumber: () => Math.floor(NOW / 1000) - 5 };
  const feed = { entity: [entity({ timestamp: longLike })] };
  const vehicles = extractLinkVehicles(feed, KNOWN, NOW);
  assert.equal(vehicles.length, 1);
  assert.equal(vehicles[0].timestamp, Math.floor(NOW / 1000) - 5);
});
