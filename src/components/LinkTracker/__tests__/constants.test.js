import { describe, it, expect } from "vitest";
import {
  LINES,
  LINE_ORDER,
  STATIONS,
  CURRENT_PATHS,
  FUTURE_PATHS,
  LINES_FOR_ERA,
  ERAS,
  stationVisibleInEra,
} from "../constants";

// Bounding box covering the Link network (Tacoma to Everett).
const BOUNDS = { latMin: 47.2, latMax: 48.05, lngMin: -122.55, lngMax: -122.0 };

const openStations = STATIONS.filter((s) => s.status === "open");

describe("LinkTracker station data invariants", () => {
  it("has unique station ids", () => {
    const ids = STATIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("references only known lines", () => {
    for (const s of STATIONS) {
      for (const lineId of [...s.currentLines, ...s.futureLines]) {
        expect(LINE_ORDER, `${s.id} references unknown line ${lineId}`).toContain(lineId);
        expect(LINES[lineId]).toBeDefined();
      }
    }
  });

  it("gives every station a valid status and matching date fields", () => {
    for (const s of STATIONS) {
      expect(["open", "construction", "planned"]).toContain(s.status);
      if (s.status === "open") {
        expect(s.opened, `${s.id} is open but has no opened date`).toMatch(
          /^\d{4}-\d{2}-\d{2}$/
        );
        expect(
          s.currentLines.length,
          `${s.id} is open but has no current lines`
        ).toBeGreaterThan(0);
      } else {
        expect(
          s.plannedOpening,
          `${s.id} is ${s.status} but has no plannedOpening`
        ).toBeTruthy();
      }
    }
  });

  it("keeps every station inside the Puget Sound bounding box", () => {
    for (const s of STATIONS) {
      expect(s.lat, `${s.id} lat`).toBeGreaterThan(BOUNDS.latMin);
      expect(s.lat, `${s.id} lat`).toBeLessThan(BOUNDS.latMax);
      expect(s.lng, `${s.id} lng`).toBeGreaterThan(BOUNDS.lngMin);
      expect(s.lng, `${s.id} lng`).toBeLessThan(BOUNDS.lngMax);
    }
  });

  it("matches the current network (June 2026)", () => {
    const byId = Object.fromEntries(STATIONS.map((s) => [s.id, s]));

    // Marymoor Village opened May 2025 and must exist.
    expect(byId["marymoor-village"]?.status).toBe("open");
    // There is no Mukilteo Link station and never has been.
    expect(byId["mukilteo"]).toBeUndefined();
    // Tacoma Dome's T Line platform has been open since 2003.
    expect(byId["tacoma-dome"].status).toBe("open");
    // Crosslake Connection stations opened in 2026, not 2024.
    expect(byId["judkins-park"].opened).toBe("2026-03-28");
    expect(byId["mercer-island"].opened).toBe("2026-03-28");
    // Federal Way extension opened December 2025.
    expect(byId["federal-way-downtown"].opened).toBe("2025-12-06");

    // Current termini.
    expect(byId["federal-way-downtown"].currentLines).toContain("1-line");
    expect(byId["downtown-redmond"].currentLines).toContain("2-line");
    expect(byId["lynnwood-city-center"].currentLines).toEqual(
      expect.arrayContaining(["1-line", "2-line"])
    );
  });

  it("only exposes operating lines in the Present era", () => {
    expect(LINES_FOR_ERA[ERAS.CURRENT]).toEqual(["1-line", "2-line", "t-line"]);
    expect(LINES_FOR_ERA[ERAS.FUTURE]).toEqual(LINE_ORDER);
    // No station may claim current service on a line that doesn't run yet.
    for (const s of STATIONS) {
      for (const lineId of s.currentLines) {
        expect(
          LINES_FOR_ERA[ERAS.CURRENT],
          `${s.id} claims current service on ${lineId}`
        ).toContain(lineId);
      }
    }
  });

  it("hides future-only stations from the Present view", () => {
    const ballard = STATIONS.find((s) => s.id === "ballard");
    expect(stationVisibleInEra(ballard, ERAS.CURRENT)).toBe(false);
    expect(stationVisibleInEra(ballard, ERAS.FUTURE)).toBe(true);
  });

  it("threads every open station's coordinates through its current line path", () => {
    for (const s of openStations) {
      for (const lineId of s.currentLines) {
        const segments = CURRENT_PATHS[lineId];
        expect(segments, `no current path for ${lineId}`).toBeDefined();
        const onPath = segments.some((seg) =>
          seg.some(([lat, lng]) => lat === s.lat && lng === s.lng)
        );
        expect(onPath, `${s.id} missing from ${lineId} current path`).toBe(true);
      }
    }
  });

  it("uses valid segment statuses in future paths", () => {
    for (const [lineId, segments] of Object.entries(FUTURE_PATHS)) {
      expect(LINE_ORDER).toContain(lineId);
      for (const seg of segments) {
        expect(["open", "planned"]).toContain(seg.status);
        expect(seg.points.length).toBeGreaterThan(1);
      }
    }
  });

  it("uses official Sound Transit line colors", () => {
    expect(LINES["1-line"].color).toBe("#3DAE2B");
    expect(LINES["2-line"].color).toBe("#00A0DF");
    expect(LINES["3-line"].color).toBe("#ED40A9");
    expect(LINES["4-line"].color).toBe("#B14FC5");
    expect(LINES["t-line"].color).toBe("#F38B00");
  });

  it("assigns future routes per the Sound Transit future service map", () => {
    const byId = Object.fromEntries(STATIONS.map((s) => [s.id, s]));
    // 1 Line: Ballard – Tacoma.
    expect(byId["ballard"].futureLines).toEqual(["1-line"]);
    expect(byId["tacoma-dome"].futureLines).toContain("1-line");
    // 3 Line: Everett – West Seattle.
    expect(byId["everett-station"].futureLines).toEqual(["3-line"]);
    expect(byId["alaska-junction"].futureLines).toEqual(["3-line"]);
    // 4 Line ends at South Kirkland and Central Issaquah.
    expect(byId["south-kirkland"].futureLines).toEqual(["4-line"]);
    expect(byId["central-issaquah"].futureLines).toEqual(["4-line"]);
  });
});
