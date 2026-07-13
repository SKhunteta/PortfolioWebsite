// GTFS-realtime vehicle-positions client for The Link, Alive.
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
    vehicles.push({
      id: v.vehicle?.id || entity.id,
      line,
      lat: v.position.latitude,
      lon: v.position.longitude,
      heading: v.position.bearing ?? null,
      timestamp: ts || Math.floor(nowMs / 1000),
    });
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
