// The Living Link — live/simulated Link train positions.
//
// GET /api/linkmap/vehicles
//   -> { mode: "live" | "simulated" | "resting", vehicles: [...], fetchedAt }
//
// live       GTFS-RT vehicle positions (fresh feed, >=1 Link train)
// simulated  service is scheduled but the feed is unavailable/stale/empty
//            (keyless local dev, upstream outage) — trains synthesized
//            deterministically from the baked GTFS schedule
// resting    no service scheduled right now (late-night gap); empty on purpose
//
// One upstream request serves every viewer: a 10s single-value cache plus
// in-flight coalescing (the ele.js pattern). Always responds 200 in the
// contract shape — the art piece should never see an error page.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config/index.js";
import { simulateVehicles, serviceActive } from "../services/linkSim.js";
import { fetchLinkVehicles } from "../services/linkFeed.js";
import { getSeattleWeather } from "../services/weather.js";

const router = express.Router();

const CACHE_TTL_MS = 10 * 1000;
let cachedPayload = null;
let cacheTimestamp = 0;
let inflightRequest = null;

const SCHEDULE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../data/linkmap-schedule.json"
);

// Baked by scripts/build-link-network.mjs (repo root). Missing file (fresh
// checkout before the data workflow has run) degrades to an empty schedule
// rather than crashing the server.
let schedule = { lines: [], service: [] };
try {
  schedule = JSON.parse(fs.readFileSync(SCHEDULE_PATH, "utf8"));
} catch {
  console.warn("linkmap: no schedule data — run scripts/build-link-network.mjs");
}
const knownRouteIds = schedule.lines.map((l) => l.id);

const linkmapLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limited", mode: "resting", vehicles: [] },
});

async function buildPayload() {
  const now = Date.now();
  const fetchedAt = new Date(now).toISOString();
  // Real Seattle rain drives the map's weather layer. getSeattleWeather has
  // its own long cache and never rejects — null simply means "unknown", and
  // the map stays dry rather than guessing.
  const weatherPromise = getSeattleWeather(now);

  if (!serviceActive(schedule, now)) {
    return { mode: "resting", vehicles: [], weather: await weatherPromise, fetchedAt };
  }

  if (config.oneBusAway.apiKey) {
    try {
      const { stale, vehicles } = await fetchLinkVehicles(
        config.oneBusAway.apiKey,
        knownRouteIds,
        now
      );
      if (!stale && vehicles.length > 0) {
        return { mode: "live", vehicles, weather: await weatherPromise, fetchedAt };
      }
    } catch (err) {
      console.error("linkmap: GTFS-RT fetch failed:", err.message);
    }
  }

  return {
    mode: "simulated",
    vehicles: simulateVehicles(schedule, now),
    weather: await weatherPromise,
    fetchedAt,
  };
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

router.get("/vehicles", linkmapLimiter, async (req, res) => {
  try {
    res.json(await getVehicles());
  } catch (err) {
    console.error("linkmap: vehicles failed:", err.message);
    res.json({ mode: "resting", vehicles: [], fetchedAt: new Date().toISOString() });
  }
});

export default router;
