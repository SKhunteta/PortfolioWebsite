// The human layer of the map. GTFS knows where a station IS; this knows what
// it's LIKE — the neighborhood, when it opened, a quiet "did you know". Baked
// from the tracker's station copy by scripts/build-link-lore.mjs (repo root)
// into src/data/station-lore.json, keyed by a normalized station name so the
// join survives the two projects disagreeing on ids (GTFS codes vs. slugs).

import loreJson from "../data/station-lore.json";

export interface StationLore {
  neighborhood?: string;
  opened?: string;
  blurb?: string;
  notableFact?: string;
}

const LORE = loreJson as Record<string, StationLore>;

// Must match the normalization the bake script used, or lookups miss.
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

// The GTFS feed abbreviates a few names the tracker spells out. Map the
// normalized GTFS form to the tracker's so those three still find their lore.
const ALIASES: Record<string, string> = {
  intldistchinatown: "internationaldistrictchinatown",
  tukwilaintlblvd: "tukwilainternationalblvd",
  univofwashington: "universityofwashington",
};

/** Lore for a station by its display name, or null if we have none. */
export function loreForName(name: string): StationLore | null {
  const key = norm(name);
  return LORE[key] ?? LORE[ALIASES[key]] ?? null;
}

/** "2016" from an ISO opened date, or null. */
export function openedYear(lore: StationLore | null): string | null {
  return lore?.opened ? lore.opened.slice(0, 4) : null;
}
