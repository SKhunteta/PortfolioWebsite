// GTFS-realtime vehicle-positions client for the King County Metro bus layer
// (Sound & Rail's street fleet). Same OneBusAway Puget Sound API and decode
// path as linkFeed.js — Metro is agency 1 where Sound Transit is agency 40 —
// but a very different scale: Link is a few dozen trains on two lines, Metro
// is up to ~1,200 coaches across the whole county at peak. So this feed keeps
// EVERY route (no known-lines filter), trims the wire format hard (short keys,
// rounded coords), and additionally tags RapidRide coaches so the client can
// paint them in their red livery.
//
// RapidRide detection: the vehicle feed only carries route IDs, so the route
// list is fetched once a day from the OBA routes-for-agency endpoint and the
// A–H "X Line" short names become a route-id set. If that lookup fails the
// buses still flow — they just all wear the standard livery (graceful, never
// blocking).
//
// The protobuf fetch stays thin; the filtering/trim logic is pure and
// unit-tested (test/metro-feed.test.js), mirroring linkFeed's split.

import GtfsRealtimeBindings from "gtfs-realtime-bindings";

const VEHICLE_POSITIONS_URL =
  process.env.METRO_GTFS_RT_URL ||
  "https://api.pugetsound.onebusaway.org/api/gtfs_realtime/vehicle-positions-for-agency/1.pb";
const ROUTES_URL =
  process.env.METRO_ROUTES_URL ||
  "https://api.pugetsound.onebusaway.org/api/where/routes-for-agency/1.json";
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

export function isFeedStale(headerTimestampSec, nowMs) {
  if (!headerTimestampSec) return true;
  return nowMs - headerTimestampSec * 1000 > FEED_STALE_MS;
}

/** RapidRide short names are "A Line" … "H Line" (case/spacing tolerant). */
export function isRapidRideName(shortName) {
  return /^[a-h]\s*line$/i.test(String(shortName ?? "").trim());
}

/** OBA routes-for-agency response -> Set of RapidRide route ids. */
export function buildRapidSet(routesJson) {
  const set = new Set();
  const list = routesJson?.data?.list ?? [];
  for (const route of list) {
    if (route?.id && isRapidRideName(route.shortName)) set.add(String(route.id));
  }
  return set;
}

const round5 = (n) => Math.round(n * 1e5) / 1e5;

// FeedMessage -> trimmed wire vehicles, every route, fresh positions only.
// Short keys on purpose: this payload ships ~1,200 vehicles every 10 s.
export function extractMetroVehicles(feed, nowMs, rapidRouteIds = new Set()) {
  const vehicles = [];
  for (const entity of feed.entity || []) {
    const v = entity.vehicle;
    if (!v?.position) continue;
    const lat = v.position.latitude;
    const lon = v.position.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const ts = toNum(v.timestamp);
    if (ts && nowMs - ts * 1000 > VEHICLE_STALE_MS) continue;
    const bus = {
      id: v.vehicle?.id || entity.id,
      lat: round5(lat),
      lon: round5(lon),
      ts: ts || Math.floor(nowMs / 1000),
    };
    const bearing = v.position.bearing;
    if (bearing != null && Number.isFinite(bearing)) bus.hdg = Math.round(bearing);
    const routeId = v.trip?.routeId;
    if (routeId && rapidRouteIds.has(String(routeId))) bus.rr = 1;
    vehicles.push(bus);
  }
  return vehicles;
}

export async function fetchMetroVehicles(apiKey, rapidRouteIds, nowMs = Date.now()) {
  const url = new URL(VEHICLE_POSITIONS_URL);
  url.searchParams.set("key", apiKey);
  const res = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`GTFS-RT responded ${res.status}`);
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
    new Uint8Array(await res.arrayBuffer())
  );
  return {
    stale: isFeedStale(toNum(feed.header?.timestamp), nowMs),
    vehicles: extractMetroVehicles(feed, nowMs, rapidRouteIds),
  };
}

export async function fetchRapidRideRoutes(apiKey) {
  const url = new URL(ROUTES_URL);
  url.searchParams.set("key", apiKey);
  const res = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`routes-for-agency responded ${res.status}`);
  return buildRapidSet(await res.json());
}
