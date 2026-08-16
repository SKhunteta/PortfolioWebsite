// The moon's pure logic: the ephemeris read, the sheet mapping, the gates
// and the pin grammar. Node-safe like the rest of world/ — no THREE, no DOM.

import { describe, expect, it } from "vitest";
import {
  moonIsUp,
  moonScreenX,
  moonScreenY,
  moonStateAt,
  parseMoonPin,
} from "../moon";

describe("moonStateAt", () => {
  it("reads a real lit fraction and a coherent up flag", () => {
    // Sweep a lunar month: the fraction must stay honest (0..1) and cover
    // both a near-new and a near-full night somewhere in the sweep.
    let min = 1;
    let max = 0;
    for (let d = 0; d < 30; d++) {
      const s = moonStateAt(new Date(Date.UTC(2026, 0, 1 + d, 9, 0, 0)));
      expect(s.fraction).toBeGreaterThanOrEqual(0);
      expect(s.fraction).toBeLessThanOrEqual(1);
      expect(s.up).toBe(moonIsUp(s.altitude));
      min = Math.min(min, s.fraction);
      max = Math.max(max, s.fraction);
    }
    expect(min).toBeLessThan(0.15);
    expect(max).toBeGreaterThan(0.85);
  });

  it("is deterministic for a fixed instant", () => {
    const at = new Date(Date.UTC(2026, 7, 16, 6, 30, 0));
    expect(moonStateAt(at)).toEqual(moonStateAt(at));
  });

  it("maps the sheet position from its own azimuth and altitude", () => {
    const s = moonStateAt(new Date(Date.UTC(2026, 3, 2, 8, 0, 0)));
    expect(s.x).toBe(moonScreenX(s.azimuth));
    expect(s.y).toBe(moonScreenY(s.altitude));
  });
});

describe("sheet mapping", () => {
  it("crosses the band east to west", () => {
    const east = moonScreenX(-Math.PI / 2);
    const south = moonScreenX(0);
    const west = moonScreenX(Math.PI / 2);
    expect(east).toBeLessThan(south);
    expect(south).toBeLessThan(west);
    expect(south).toBeCloseTo(0.5);
  });

  it("stays on the sheet at any azimuth", () => {
    for (let a = -Math.PI; a <= Math.PI; a += 0.1) {
      const x = moonScreenX(a);
      expect(x).toBeGreaterThan(0.05);
      expect(x).toBeLessThan(0.95);
    }
  });

  it("rides higher in the band as the moon climbs, clamped to the band", () => {
    const low = moonScreenY(0.1);
    const high = moonScreenY(0.9);
    expect(high).toBeGreaterThan(low);
    // Below the horizon or absurdly high, y still stays inside the band.
    expect(moonScreenY(-1)).toBeGreaterThanOrEqual(0.7);
    expect(moonScreenY(3)).toBeLessThanOrEqual(0.95);
  });
});

describe("moonIsUp", () => {
  it("wants a hand above the horizon, not a grazing rise", () => {
    expect(moonIsUp(-0.2)).toBe(false);
    expect(moonIsUp(0.01)).toBe(false);
    expect(moonIsUp(0.5)).toBe(true);
  });
});

describe("parseMoonPin", () => {
  it("understands the pin grammar", () => {
    expect(parseMoonPin(null)).toBeNull();
    expect(parseMoonPin("off")).toEqual({ kind: "off" });
    expect(parseMoonPin("on")).toEqual({ kind: "on", fraction: null });
    expect(parseMoonPin("full")).toEqual({ kind: "on", fraction: 1 });
    expect(parseMoonPin("new")).toEqual({ kind: "on", fraction: 0 });
    expect(parseMoonPin("0.4")).toEqual({ kind: "on", fraction: 0.4 });
  });

  it("clamps numbers and shrugs at nonsense", () => {
    expect(parseMoonPin("7")).toEqual({ kind: "on", fraction: 1 });
    expect(parseMoonPin("-2")).toEqual({ kind: "on", fraction: 0 });
    expect(parseMoonPin("cheese")).toBeNull();
  });
});
