// The dive incision's pure half (map/paperCut.ts). These guard the carve's
// geometric contract: the parallax sheets must hang strictly between the
// paper's underside and the tunnel roof, terrace inward with depth, and —
// even at the deckle's deepest bite — never cut into the hall's lamplit
// ring wall (HallShells), which the aperture exists to reveal.

import { describe, expect, it } from "vitest";
import {
  buildCutSheets,
  easeCutStrength,
  minDeckledRadius,
  CUT_SURFACE_R,
  CUT_SURFACE_AMP,
  SHEET_AMP,
  SHEET_COUNT,
  SHEET_BODY_R,
  SHEET_FADE_R,
  HALL_WALL_R,
  PAPER_CUT_VEC,
} from "../paperCut";
import { CONFIG } from "../../world/config";

const WALL_TOP_Y = -0.04; // HallShells' contract: the paper's underside

describe("the sheet stack", () => {
  const sheets = buildCutSheets();

  it("builds the full stack, deepest first (painter's order)", () => {
    expect(sheets).toHaveLength(SHEET_COUNT);
    for (let i = 1; i < sheets.length; i++) {
      expect(sheets[i].y).toBeGreaterThan(sheets[i - 1].y);
    }
  });

  it("hangs strictly between the paper's underside and the tunnel roof", () => {
    for (const s of sheets) {
      expect(s.y).toBeLessThan(WALL_TOP_Y);
      expect(s.y).toBeGreaterThan(CONFIG.ribbon.y.tunnel);
    }
  });

  it("terraces inward with depth, all inside the surface tear", () => {
    for (let i = 1; i < sheets.length; i++) {
      expect(sheets[i].radius).toBeGreaterThan(sheets[i - 1].radius);
    }
    for (const s of sheets) {
      expect(s.radius).toBeLessThan(CUT_SURFACE_R);
    }
  });

  it("never cuts into the hall's ring wall, even at the deckle's deepest bite", () => {
    for (const s of sheets) {
      expect(minDeckledRadius(s.radius, SHEET_AMP)).toBeGreaterThan(HALL_WALL_R);
    }
    expect(minDeckledRadius(CUT_SURFACE_R, CUT_SURFACE_AMP)).toBeGreaterThan(HALL_WALL_R);
  });

  it("darkens with depth and dissolves before its quad edge", () => {
    for (let i = 1; i < sheets.length; i++) {
      expect(sheets[i].shade).toBeGreaterThan(sheets[i - 1].shade);
    }
    for (const s of sheets) {
      expect(s.shade).toBeGreaterThan(0);
      expect(s.shade).toBeLessThanOrEqual(1);
    }
    expect(SHEET_FADE_R).toBeGreaterThan(SHEET_BODY_R);
    expect(SHEET_BODY_R).toBeGreaterThan(CUT_SURFACE_R * (1 + CUT_SURFACE_AMP));
  });

  it("gives every sheet its own deckle seed", () => {
    const seeds = new Set(sheets.map((s) => s.seed));
    expect(seeds.size).toBe(sheets.length);
  });
});

describe("the eased cut strength", () => {
  it("opens while a dive holds and clamps at 1", () => {
    let s = 0;
    s = easeCutStrength(s, true, 0.1);
    expect(s).toBeGreaterThan(0);
    s = easeCutStrength(s, true, 100);
    expect(s).toBe(1);
  });

  it("closes on release and clamps at 0", () => {
    let s = 1;
    s = easeCutStrength(s, false, 0.1);
    expect(s).toBeLessThan(1);
    s = easeCutStrength(s, false, 100);
    expect(s).toBe(0);
  });

  it("starts closed (the shared signal boots at zero strength)", () => {
    expect(PAPER_CUT_VEC.z).toBe(0);
  });
});
