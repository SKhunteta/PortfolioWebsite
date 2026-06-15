import express from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config/index.js";

const router = express.Router();

const OBA_BASE = "https://api.pugetsound.onebusaway.org/api/where";
const ARRIVALS_CACHE_TTL_MS = 20 * 1000;
const STOPS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const STOP_SEARCH_RADIUS_M = 350;
const UPSTREAM_TIMEOUT_MS = 8 * 1000;

// Puget Sound bounding box — reject coordinates outside the Link network.
const BOUNDS = { latMin: 47.2, latMax: 48.1, lngMin: -122.6, lngMax: -121.9 };

// stationId -> { data, timestamp }
const arrivalsCache = new Map();
// stationId -> { stopIds, timestamp }
const stopsCache = new Map();

const linkrailLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limited", available: false },
});

function obaUrl(path, params = {}) {
  const url = new URL(`${OBA_BASE}/${path}.json`);
  url.searchParams.set("key", config.oneBusAway.apiKey);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}

async function obaGet(path, params) {
  const res = await fetch(obaUrl(path, params), {
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`OBA ${path} responded ${res.status}`);
  const body = await res.json();
  if (body.code !== 200) throw new Error(`OBA ${path} returned code ${body.code}`);
  return body.data;
}

// Link platform stops near a station are discovered (and cached) rather than
// hardcoded, so the mapping can't drift from OneBusAway's stop IDs.
async function resolveStopIds(stationId, lat, lng) {
  const cached = stopsCache.get(stationId);
  if (cached && Date.now() - cached.timestamp < STOPS_CACHE_TTL_MS) {
    return cached.stopIds;
  }

  const data = await obaGet("stops-for-location", {
    lat,
    lon: lng,
    radius: STOP_SEARCH_RADIUS_M,
  });

  const routesById = new Map(
    (data.references?.routes || []).map((r) => [r.id, r])
  );
  const isLinkRoute = (routeId) => {
    const r = routesById.get(routeId);
    if (!r) return false;
    // Link light rail is GTFS route_type 0 (tram/streetcar/light rail).
    // Check the type, not just the name: King County Metro RapidRide buses
    // are named "<letter> Line" (C/D/E/F/G/H Line) and would otherwise match
    // the name check, putting buses on the downtown departure board.
    if (r.type !== 0) return false;
    const name = `${r.shortName || ""} ${r.longName || ""}`.toLowerCase();
    return name.includes("line");
  };

  const stopIds = (data.list || [])
    .filter((stop) => (stop.routeIds || []).some(isLinkRoute))
    .map((stop) => stop.id);

  stopsCache.set(stationId, { stopIds, timestamp: Date.now() });
  return stopIds;
}

async function fetchArrivals(stationId, lat, lng) {
  const stopIds = await resolveStopIds(stationId, lat, lng);
  if (stopIds.length === 0) return [];

  const now = Date.now();
  const results = await Promise.allSettled(
    stopIds.map((stopId) =>
      obaGet(`arrivals-and-departures-for-stop/${stopId}`, {
        minutesBefore: 0,
        minutesAfter: 45,
      })
    )
  );

  const arrivals = [];
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const routesById = new Map(
      (result.value.references?.routes || []).map((r) => [r.id, r])
    );
    for (const ad of result.value.entry?.arrivalsAndDepartures || []) {
      // Link trains only: GTFS route_type 0. RapidRide buses share the
      // "<letter> Line" naming, so the name check alone lets buses through —
      // require the route to be light rail as well.
      const route = routesById.get(ad.routeId);
      if (!route || route.type !== 0) continue;
      const name = `${ad.routeShortName || ""}`.toLowerCase();
      if (!name.includes("line")) continue;
      const predicted = ad.predictedArrivalTime || ad.predictedDepartureTime;
      const scheduled = ad.scheduledArrivalTime || ad.scheduledDepartureTime;
      const when = predicted > 0 ? predicted : scheduled;
      if (!when || when < now - 30 * 1000) continue;
      arrivals.push({
        line: ad.routeShortName,
        headsign: ad.tripHeadsign || "",
        minutes: Math.max(0, Math.round((when - now) / 60000)),
        realtime: predicted > 0,
      });
    }
  }

  arrivals.sort((a, b) => a.minutes - b.minutes);
  return arrivals;
}

// GET /api/linkrail/arrivals/:stationId?lat=..&lng=..
router.get("/arrivals/:stationId", linkrailLimiter, async (req, res) => {
  if (!config.oneBusAway.apiKey) {
    return res.json({ available: false, reason: "not_configured" });
  }

  const stationId = String(req.params.stationId).slice(0, 64);
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < BOUNDS.latMin ||
    lat > BOUNDS.latMax ||
    lng < BOUNDS.lngMin ||
    lng > BOUNDS.lngMax
  ) {
    return res.status(400).json({ available: false, reason: "bad_coordinates" });
  }

  const cached = arrivalsCache.get(stationId);
  if (cached && Date.now() - cached.timestamp < ARRIVALS_CACHE_TTL_MS) {
    return res.json(cached.data);
  }

  try {
    const arrivals = await fetchArrivals(stationId, lat, lng);
    const data = { available: true, arrivals };
    arrivalsCache.set(stationId, { data, timestamp: Date.now() });
    res.json(data);
  } catch (err) {
    console.error(`linkrail: arrivals failed for ${stationId}:`, err.message);
    res.json({ available: false, reason: "upstream_error" });
  }
});

export default router;
