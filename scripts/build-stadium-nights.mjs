#!/usr/bin/env node
// Bakes real home-game nights for The Living Link's stadium lights into
//   link-map/src/data/stadium-nights.json
//
// Sources (all public, no keys):
//   - MLB Stats API      → Mariners home games   → T-Mobile Park ("tmobile")
//   - ESPN site API MLS  → Sounders home matches → Lumen Field   ("lumen")
//   - ESPN site API NFL  → Seahawks home games   → Lumen Field   ("lumen")
//
// Usage:
//   node scripts/build-stadium-nights.mjs                # fetch schedules
//   node scripts/build-stadium-nights.mjs --placeholder  # write the empty stub
//
// Runs in CI via .github/workflows/refresh-link-data.yml (sandboxes may not
// reach these hosts). Sources fail independently: a Sounders outage must not
// cost the Mariners their lights. If EVERY source fails the script exits
// nonzero and leaves the committed file untouched — the stadiums simply
// don't light, which is absence, not invention.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.resolve(here, "../link-map/src/data/stadium-nights.json");

const HORIZON_DAYS = 180;
const USER_AGENT =
  "builtbyshrey.com link-map stadium-nights bake (+https://github.com/SKhunteta/PortfolioWebsite)";

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function write(meta, events) {
  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      placeholder: false,
      horizonDays: HORIZON_DAYS,
      ...meta,
    },
    events,
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 1) + "\n");
}

if (process.argv.includes("--placeholder")) {
  fs.writeFileSync(
    OUT_PATH,
    JSON.stringify(
      { meta: { generatedAt: null, placeholder: true, sources: [], horizonDays: 0 }, events: [] },
      null,
      1
    ) + "\n"
  );
  console.log(`Wrote placeholder stub → ${OUT_PATH}`);
  process.exit(0);
}

async function getJson(url) {
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

const now = new Date();
const until = new Date(now.getTime() + HORIZON_DAYS * 86_400_000);

/** Mariners home games from the MLB Stats API (teamId 136). */
async function mariners() {
  const url =
    `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=136` +
    `&startDate=${isoDate(now)}&endDate=${isoDate(until)}`;
  const json = await getJson(url);
  const events = [];
  for (const day of json.dates ?? []) {
    for (const g of day.games ?? []) {
      if (g.teams?.home?.team?.id !== 136) continue; // away games don't light SODO
      if (!g.gameDate) continue;
      events.push({
        venue: "tmobile",
        startsAt: g.gameDate,
        title: `Mariners v ${g.teams?.away?.team?.teamName ?? g.teams?.away?.team?.name ?? "?"}`,
      });
    }
  }
  return events;
}

/** Home fixtures from ESPN's public site API (Sounders MLS, Seahawks NFL). */
async function espnSchedule(sportPath, teamName) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/schedule`;
  const json = await getJson(url);
  const events = [];
  for (const e of json.events ?? []) {
    const comp = e.competitions?.[0];
    if (!comp?.date) continue;
    const home = comp.competitors?.find((c) => c.homeAway === "home");
    const away = comp.competitors?.find((c) => c.homeAway === "away");
    const homeName = home?.team?.shortDisplayName ?? home?.team?.displayName ?? "";
    if (!homeName.toLowerCase().includes(teamName.toLowerCase())) continue;
    const startMs = Date.parse(comp.date);
    if (!Number.isFinite(startMs) || startMs < now.getTime() - 86_400_000) continue;
    if (startMs > until.getTime()) continue;
    events.push({
      venue: "lumen",
      startsAt: new Date(startMs).toISOString(),
      title: `${teamName} v ${away?.team?.shortDisplayName ?? "?"}`,
    });
  }
  return events;
}

const SOURCES = [
  { name: "mlb-mariners", run: mariners },
  { name: "espn-sounders", run: () => espnSchedule("soccer/usa.1/teams/sea", "Sounders") },
  { name: "espn-seahawks", run: () => espnSchedule("football/nfl/teams/sea", "Seahawks") },
];

const results = await Promise.allSettled(SOURCES.map((s) => s.run()));
const okSources = [];
const events = [];
results.forEach((r, i) => {
  if (r.status === "fulfilled") {
    okSources.push(SOURCES[i].name);
    events.push(...r.value);
    console.log(`${SOURCES[i].name}: ${r.value.length} home dates`);
  } else {
    console.error(`${SOURCES[i].name} FAILED: ${r.reason?.message ?? r.reason}`);
  }
});

if (okSources.length === 0) {
  console.error("Every schedule source failed; leaving the committed file untouched.");
  process.exit(1);
}

// Dedupe (a doubleheader shares a venue+minute) and sort by start.
const seen = new Set();
const deduped = events
  .filter((e) => {
    const key = `${e.venue}:${e.startsAt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));

write({ sources: okSources }, deduped);
console.log(`Baked ${deduped.length} game nights (${okSources.join(", ")}) → ${OUT_PATH}`);
