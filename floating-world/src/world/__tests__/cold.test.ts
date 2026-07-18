// The visible-breath signal (the ferry deck's cold days). The honesty here is
// the ramp: no breath on a mild day, a full plume on a freezing one, and only
// ever from a REAL temperature (or a snow day) — never a guess. This locks the
// pure ramp; the eased level + snow floor + override live in easeWeather.

import { describe, it, expect } from "vitest";
import { coldnessAtC } from "../weather";

describe("coldnessAtC — the visible-breath ramp", () => {
  it("is 0 on a mild day (no breath above ~10 °C)", () => {
    expect(coldnessAtC(10)).toBe(0);
    expect(coldnessAtC(15)).toBe(0);
    expect(coldnessAtC(22)).toBe(0);
  });

  it("is 1 on a freezing day (full plume at/below ~1 °C)", () => {
    expect(coldnessAtC(1)).toBe(1);
    expect(coldnessAtC(-4)).toBe(1);
  });

  it("ramps monotonically through the cold-snap band", () => {
    const mid = coldnessAtC(5.5);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    // colder is always at least as breathy as warmer
    for (let c = 12; c >= -2; c -= 0.5) {
      expect(coldnessAtC(c)).toBeGreaterThanOrEqual(coldnessAtC(c + 0.5));
    }
  });

  it("stays clamped to 0..1 at the extremes", () => {
    expect(coldnessAtC(40)).toBe(0);
    expect(coldnessAtC(-40)).toBe(1);
  });
});
