// Sound & Rail's live King County Metro bus layer.
//
// GET /api/metro/vehicles
//   -> { mode: "live" | "unavailable", vehicles: [...], fetchedAt }
//
// live         fresh GTFS-RT vehicle positions for agency 1 (King County
//              Metro) — the whole in-service fleet, trimmed to short keys
//              ({id, lat, lon, hdg?, ts, rr?}); rr marks RapidRide coaches.
// unavailable  keyless dev or upstream outage/staleness. There is NO bus
//              simulator here on purpose: the client already carries its own
//              deterministic ambient fleet (the pre-live Buses layer) and
//              falls back to it, clearly stylized and never presented as
//              live. An empty-but-fresh feed is still "live" — 3am's handful
//              of owl runs is honest data, not an outage.
//
// One upstream request serves every viewer: a 10s single-value cache plus
// in-flight coalescing (the linkmap.js pattern). The RapidRide route-id set
// refreshes lazily once a day and degrades to "no red coaches" on failure.
// Always responds 200 in the contract shape.

import express from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config/index.js";
import { fetchMetroVehicles, fetchRapidRideRoutes } from "../services/metroFeed.js";

const router = express.Router();

const CACHE_TTL_MS = 10 * 1000;
const RAPID_TTL_MS = 24 * 60 * 60 * 1000;

let cachedPayload = null;
let cacheTimestamp = 0;
let inflightRequest = null;

let rapidSet = new Set();
let rapidFetchedAt = 0;
let rapidInflight = null;

const metroLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limited", mode: "unavailable", vehicles: [] },
});

function refreshRapidSet() {
  if (Date.now() - rapidFetchedAt < RAPID_TTL_MS || rapidInflight) return;
  rapidInflight = fetchRapidRideRoutes(config.oneBusAway.apiKey)
    .then((set) => {
      rapidSet = set;
      rapidFetchedAt = Date.now();
    })
    .catch((err) => {
      // Retry no sooner than an hour — buses flow fine without the red flag.
      rapidFetchedAt = Date.now() - RAPID_TTL_MS + 60 * 60 * 1000;
      console.warn("metro: RapidRide route lookup failed:", err.message);
    })
    .finally(() => {
      rapidInflight = null;
    });
}

async function buildPayload() {
  const now = Date.now();
  const fetchedAt = new Date(now).toISOString();

  if (config.oneBusAway.apiKey) {
    refreshRapidSet(); // fire-and-forget; this poll uses whatever set we have
    try {
      const { stale, vehicles } = await fetchMetroVehicles(
        config.oneBusAway.apiKey,
        rapidSet,
        now
      );
      if (!stale) {
        return { mode: "live", vehicles, fetchedAt };
      }
    } catch (err) {
      console.error("metro: GTFS-RT fetch failed:", err.message);
    }
  }

  return { mode: "unavailable", vehicles: [], fetchedAt };
}

function getVehicles() {
  if (cachedPayload && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return Promise.resolve(cachedPayload);
  }
  if (inflightRequest) return inflightRequest;
  inflightRequest = buildPayload()
    .then((payload) => {
      cachedPayload = payload;
      cacheTimestamp = Date.now();
      return payload;
    })
    .finally(() => {
      inflightRequest = null;
    });
  return inflightRequest;
}

router.get("/vehicles", metroLimiter, async (req, res) => {
  try {
    res.json(await getVehicles());
  } catch (err) {
    console.error("metro: vehicles failed:", err.message);
    res.json({ mode: "unavailable", vehicles: [], fetchedAt: new Date().toISOString() });
  }
});

export default router;
