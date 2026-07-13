// Bakes station lore for The Living Link.
//
// The artistic map (link-map/) knows GTFS geometry but nothing about the
// PLACES — the tracker component (src/components/LinkTracker) carries the
// human layer: neighborhood, a short blurb, a "did you know" fact, the date
// each station opened. This script lifts that lore out of the tracker and
// bakes it into link-map/src/data/station-lore.json, keyed by a normalized
// station name so the two datasets (GTFS stop codes vs. tracker slugs) line
// up without hand-maintained id maps.
//
// Re-run after editing the tracker's station copy:
//   node scripts/build-link-lore.mjs

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { STATIONS } from "../src/components/LinkTracker/constants.js";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, "../link-map/src/data/station-lore.json");

// Same normalization link-map uses to join the two name spaces: lowercase,
// strip everything that isn't a letter or digit. Keep it identical to
// stations/lore.ts or the join silently drops stations.
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

const lore = {};
for (const s of STATIONS) {
  // Only bake fields the piece actually whispers. Skip empty entries so the
  // panel can treat "no lore" as a clean absence.
  const entry = {};
  if (s.neighborhood) entry.neighborhood = s.neighborhood;
  if (s.opened) entry.opened = s.opened;
  if (s.blurb) entry.blurb = s.blurb;
  if (s.notableFact) entry.notableFact = s.notableFact;
  if (Object.keys(entry).length === 0) continue;
  lore[norm(s.name)] = entry;
}

writeFileSync(OUT, JSON.stringify(lore, null, 1) + "\n");
console.log(
  `Baked lore for ${Object.keys(lore).length} stations → ${OUT.replace(resolve(here, ".."), ".")}`
);
