// The bus fleet's pure half: Metro's service-span curve and the stop-and-go
// motion profile a bus drives along its corridor (world/buses.ts).

import { describe, it, expect } from "vitest";
import { busServiceAt, busCycle, busDistanceAt, BUS_EASE_S, type BusRun } from "../buses";

const RUN: BusRun = {
  lengthKm: 2.1,
  speedKmS: 0.008,
  stopSpacingKm: 0.42,
  dwellS: 7,
  phase: 0,
};

describe("Metro service span", () => {
  it("peaks at both rushes, holds a solid midday, whispers overnight", () => {
    const rushAm = busServiceAt(8);
    const rushPm = busServiceAt(17.5);
    const midday = busServiceAt(13);
    const owl = busServiceAt(3);
    expect(rushAm).toBeGreaterThan(0.8);
    expect(rushPm).toBeGreaterThan(0.8);
    // Transit keeps rolling midday — well above the owl floor, below rush.
    expect(midday).toBeGreaterThan(0.4);
    expect(midday).toBeLessThan(rushAm);
    // 3am is the owl network only: a whisper, but never zero.
    expect(owl).toBeGreaterThan(0);
    expect(owl).toBeLessThan(0.1);
  });

  it("ramps up through the early pull-out and tapers through the evening", () => {
    expect(busServiceAt(4)).toBeLessThan(busServiceAt(5.5));
    expect(busServiceAt(5.5)).toBeLessThan(busServiceAt(7));
    expect(busServiceAt(20)).toBeGreaterThan(busServiceAt(22));
    expect(busServiceAt(22)).toBeGreaterThan(busServiceAt(24));
    // The evening tail is still real service, not the owl floor.
    expect(busServiceAt(21)).toBeGreaterThan(0.15);
  });

  it("stays in 0..1 and wraps the day", () => {
    for (let h = 0; h <= 48; h += 0.25) {
      const v = busServiceAt(h);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(busServiceAt(25)).toBeCloseTo(busServiceAt(1), 10);
    expect(busServiceAt(-1)).toBeCloseTo(busServiceAt(23), 10);
  });
});

describe("stop-and-go profile", () => {
  it("divides the corridor into even hops near the target spacing", () => {
    const c = busCycle(RUN);
    expect(c.hops).toBe(5); // 2.1 / 0.42
    expect(c.hopKm * c.hops).toBeCloseTo(RUN.lengthKm, 10);
    expect(c.periodS).toBeCloseTo(c.hops * (c.hopKm / RUN.speedKmS + RUN.dwellS), 10);
    // A corridor shorter than the spacing still gets one whole hop.
    expect(busCycle({ ...RUN, lengthKm: 0.3 }).hops).toBe(1);
  });

  it("is monotonic within a loop and wraps cleanly", () => {
    const c = busCycle(RUN);
    let prev = busDistanceAt(0, RUN, { s: 0, moving: 0 }).s;
    for (let t = 0.5; t < c.periodS; t += 0.5) {
      const { s } = busDistanceAt(t, RUN, { s: 0, moving: 0 });
      expect(s).toBeGreaterThanOrEqual(prev - 1e-9);
      expect(s).toBeLessThanOrEqual(RUN.lengthKm + 1e-9);
      prev = s;
    }
    // One full period later the bus is back where it started.
    const a = busDistanceAt(12.3, RUN, { s: 0, moving: 0 });
    const b = busDistanceAt(12.3 + c.periodS, RUN, { s: 0, moving: 0 });
    expect(b.s).toBeCloseTo(a.s, 9);
    expect(b.moving).toBeCloseTo(a.moving, 9);
  });

  it("holds position (moving = 0) through each dwell", () => {
    const c = busCycle(RUN);
    // Sample mid-dwell of the first stop.
    const t = c.hopTravelS + RUN.dwellS / 2;
    const { s, moving } = busDistanceAt(t, RUN, { s: 0, moving: 0 });
    expect(moving).toBe(0);
    expect(s).toBeCloseTo(c.hopKm, 10);
    // Position is pinned for the whole dwell.
    const late = busDistanceAt(c.hopTravelS + RUN.dwellS - 0.01, RUN, { s: 0, moving: 0 });
    expect(late.s).toBeCloseTo(c.hopKm, 10);
  });

  it("eases out of and into every stop", () => {
    const c = busCycle(RUN);
    // Just after pull-out: moving is climbing but not yet full.
    const early = busDistanceAt(BUS_EASE_S / 2, RUN, { s: 0, moving: 0 });
    expect(early.moving).toBeGreaterThan(0);
    expect(early.moving).toBeLessThan(1);
    // Mid-hop: fully under way.
    expect(busDistanceAt(c.hopTravelS / 2, RUN, { s: 0, moving: 0 }).moving).toBe(1);
    // Braking for the stop: falling again.
    const braking = busDistanceAt(c.hopTravelS - BUS_EASE_S / 2, RUN, { s: 0, moving: 0 });
    expect(braking.moving).toBeGreaterThan(0);
    expect(braking.moving).toBeLessThan(1);
  });

  it("is deterministic and respects the phase offset", () => {
    const shifted: BusRun = { ...RUN, phase: 0.5 };
    const c = busCycle(RUN);
    const a = busDistanceAt(10, shifted, { s: 0, moving: 0 });
    const b = busDistanceAt(10 + c.periodS / 2, RUN, { s: 0, moving: 0 });
    expect(a.s).toBeCloseTo(b.s, 9);
    // Negative clock times (phase wrap) stay in range.
    const neg = busDistanceAt(-3, RUN, { s: 0, moving: 0 });
    expect(neg.s).toBeGreaterThanOrEqual(0);
    expect(neg.s).toBeLessThanOrEqual(RUN.lengthKm);
  });
});
