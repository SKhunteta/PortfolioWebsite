// One normalization for every by-name station join (lore, identity). GTFS ids
// and the tracker's slugs disagree, so lookups key on a squashed display name.
// Must match what scripts/build-link-lore.mjs bakes, or lookups miss.

export const normStationName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

// The GTFS feed abbreviates a few names the tracker (and our hand-authored
// data) spells out. Map the normalized GTFS form to the long form.
export const STATION_NAME_ALIASES: Record<string, string> = {
  intldistchinatown: "internationaldistrictchinatown",
  tukwilaintlblvd: "tukwilainternationalblvd",
  univofwashington: "universityofwashington",
};

/** Look a station up in a by-normalized-name record, alias-aware. */
export function byStationName<T>(record: Record<string, T>, name: string): T | null {
  const key = normStationName(name);
  return record[key] ?? record[STATION_NAME_ALIASES[key]] ?? null;
}
