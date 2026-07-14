// GTFS-realtime vehicle-positions client for The Living Link.
//
// Sound Transit publishes GTFS-RT through the OneBusAway Puget Sound API
// (same OBA_API_KEY the linkrail departure board uses). The protobuf fetch
// stays thin here; the filtering/staleness logic is pure and unit-tested.

import GtfsRealtimeBindings from "gtfs-realtime-bindings";

const VEHICLE_POSITIONS_URL =
  process.env.LINK_GTFS_RT_URL ||
  "https://api.pugetsound.onebusaway.org/api/gtfs_realtime/vehicle-positions-for-agency/40.pb";
const UPSTREAM_TIMEOUT_MS = 8 * 1000;
const FEED_STALE_MS = 5 * 60 * 1000;
const VEHICLE_STALE_MS = 3 * 60 * 1000;

// protobufjs int64s arrive as Long objects.
const toNum = (v) =>
  v == null
    ? null
    : typeof v === "object" && typeof v.toNumber === "function"
      ? v.toNumber()
      : Number(v);

// OBA prefixes GTFS ids with the agency ("40_100479"); the static feed's ids
// have no prefix. Match either spelling.
export function matchLineId(feedRouteId, knownIds) {
  if (!feedRouteId) return null;
  const bare = String(feedRouteId).replace(/^\d+_/, "");
  for (const id of knownIds) {
    const knownBare = String(id).replace(/^\d+_/, "");
    if (bare === knownBare) return id;
  }
  return null;
}

export function isFeedStale(headerTimestampSec, nowMs) {
  if (!headerTimestampSec) return true;
  return nowMs - headerTimestampSec * 1000 > FEED_STALE_MS;
}

// GTFS-RT OccupancyStatus enum -> a representative 0..1 crowding fraction.
// The art reads this as ink weight, not a headcount, so a coarse mapping is
// honest enough. Statuses that carry NO ridership signal (no data, not
// boardable) map to null so the client falls back to its ambient estimate
// rather than painting a train as empty on a guess.
const OCCUPANCY_FRACTION = {
  0: 0.05, // EMPTY
  1: 0.25, // MANY_SEATS_AVAILABLE
  2: 0.5, // FEW_SEATS_AVAILABLE
  3: 0.7, // STANDING_ROOM_ONLY
  4: 0.9, // CRUSHED_STANDING_ROOM_ONLY
  5: 1.0, // FULL
  6: 1.0, // NOT_ACCEPTING_PASSENGERS (at/over capacity)
};

// Real crowding as a 0..1 fraction, or null when the feed says nothing usable.
// occupancy_percentage (when a sane number) wins; otherwise the status enum.
export function readOccupancy(vehicle) {
  const pct = toNum(vehicle?.occupancyPercentage);
  if (pct != null && Number.isFinite(pct) && pct >= 0) {
    return Math.min(1, pct / 100);
  }
  const status = vehicle?.occupancyStatus;
  if (status != null && Object.prototype.hasOwnProperty.call(OCCUPANCY_FRACTION, status)) {
    return OCCUPANCY_FRACTION[status];
  }
  return null;
}

// FeedMessage -> contract vehicles, Link routes only, fresh positions only.
export function extractLinkVehicles(feed, knownRouteIds, nowMs) {
  const vehicles = [];
  for (const entity of feed.entity || []) {
    const v = entity.vehicle;
    if (!v?.position) continue;
    const line = matchLineId(v.trip?.routeId, knownRouteIds);
    if (!line) continue;
    const ts = toNum(v.timestamp);
    if (ts && nowMs - ts * 1000 > VEHICLE_STALE_MS) continue;
    const vehicle = {
      id: v.vehicle?.id || entity.id,
      line,
      lat: v.position.latitude,
      lon: v.position.longitude,
      heading: v.position.bearing ?? null,
      timestamp: ts || Math.floor(nowMs / 1000),
    };
    // Only carry occupancy when the feed actually reports it — a missing field
    // stays missing on the wire, so the client can honestly fall back to its
    // clock-keyed ambient estimate instead of a fabricated zero.
    const occupancy = readOccupancy(v);
    if (occupancy != null) vehicle.occupancy = occupancy;
    vehicles.push(vehicle);
  }
  return vehicles;
}

export async function fetchLinkVehicles(apiKey, knownRouteIds, nowMs = Date.now()) {
  const url = new URL(VEHICLE_POSITIONS_URL);
  url.searchParams.set("key", apiKey);
  const res = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`GTFS-RT responded ${res.status}`);
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
    new Uint8Array(await res.arrayBuffer())
  );
  return {
    stale: isFeedStale(toNum(feed.header?.timestamp), nowMs),
    vehicles: extractLinkVehicles(feed, knownRouteIds, nowMs),
  };
}
