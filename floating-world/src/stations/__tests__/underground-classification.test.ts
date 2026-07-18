// The underground bucket is a researched FACT (station-identity.json), not a
// geometric guess — Stations.tsx classifies by `structure === "underground"`.
// This guards the data that classification rides on: a GTFS rebake that
// renames a stop, or an identity edit that drops a hall, would silently cost
// a station its fresco/crowd/shaft/dive (Beacon Hill) or sink a surface
// platform under the paper (SODO once sat mid-portal-ramp at −0.10).

import { describe, expect, it } from "vitest";
import network from "../../data/network.json";
import { identityForName } from "../identity";
import { motifForName } from "../motifs";

const HALLS = [
  "Roosevelt",
  "U District",
  "Univ of Washington",
  "Capitol Hill",
  "Westlake",
  "Symphony",
  "Pioneer Square",
  "Beacon Hill",
];

describe("underground classification", () => {
  it("every station in the baked network has a researched identity", () => {
    for (const s of network.stations) {
      expect(identityForName(s.name), s.name).not.toBeNull();
    }
  });

  it("exactly the eight halls are underground", () => {
    const underground = network.stations
      .filter((s) => identityForName(s.name)?.structure === "underground")
      .map((s) => s.name)
      .sort();
    expect(underground).toEqual([...HALLS].sort());
  });

  it("portal-boundary surface stations stay on the paper", () => {
    for (const name of ["SODO", "East Main", "Int'l Dist/Chinatown"]) {
      expect(identityForName(name)?.structure, name).not.toBe("underground");
    }
  });

  it("every hall paints its real artwork", () => {
    for (const name of HALLS) {
      expect(motifForName(name), name).not.toBeNull();
    }
  });
});
