// The Fremont Bridge's opening schedule — the pure wall-clock logic behind
// map/FremontBridge.tsx. All sample times are August 2026, PDT (UTC-7).

import { afterEach, describe, expect, it } from "vitest";
import {
  bridgeState,
  bridgeStateAt,
  rushRestricted,
  setBridgeOverride,
  SLOT_S,
} from "../fremont";

const at = (iso: string) => new Date(iso);

afterEach(() => setBridgeOverride(null));

describe("rushRestricted", () => {
  it("holds the leaves down on weekday rush windows", () => {
    // Wednesday 2026-08-19, 8:00 and 17:00 PDT.
    expect(rushRestricted(at("2026-08-19T15:00:00Z"))).toBe(true);
    expect(rushRestricted(at("2026-08-20T00:00:00Z"))).toBe(true); // Wed 17:00
  });

  it("frees weekday midday and all weekend hours", () => {
    expect(rushRestricted(at("2026-08-19T19:00:00Z"))).toBe(false); // Wed noon
    expect(rushRestricted(at("2026-08-22T15:00:00Z"))).toBe(false); // Sat 8:00
    expect(rushRestricted(at("2026-08-23T23:30:00Z"))).toBe(false); // Sun 16:30
  });
});

describe("bridgeStateAt", () => {
  it("never opens during a weekday rush window", () => {
    // Sweep Wednesday 7:00–9:00 PDT at 30 s steps.
    const start = at("2026-08-19T14:00:00Z").getTime();
    for (let ms = start; ms < start + 2 * 3600_000; ms += 30_000) {
      expect(bridgeStateAt(new Date(ms)).open01).toBe(0);
    }
  });

  it("opens some slots (and rests others) through a free afternoon", () => {
    // Saturday 10:00–16:00 PDT — ~50 slots, both outcomes must occur.
    const start = at("2026-08-22T17:00:00Z").getTime();
    let peak = 0;
    let closedSlots = 0;
    for (let slot = 0; slot < 50; slot++) {
      let slotPeak = 0;
      for (let s = 0; s < SLOT_S; s += 10) {
        const { open01 } = bridgeStateAt(new Date(start + (slot * SLOT_S + s) * 1000));
        slotPeak = Math.max(slotPeak, open01);
      }
      peak = Math.max(peak, slotPeak);
      if (slotPeak === 0) closedSlots++;
    }
    expect(peak).toBe(1); // some opening reaches fully raised
    expect(closedSlots).toBeGreaterThan(0); // and the canal is often quiet
  });

  it("is deterministic and bounded, with a sane boat", () => {
    const start = at("2026-08-22T17:00:00Z").getTime();
    let sawBoat = false;
    for (let ms = start; ms < start + 3600_000; ms += 5_000) {
      const a = bridgeStateAt(new Date(ms));
      const b = bridgeStateAt(new Date(ms));
      expect(a.open01).toBe(b.open01);
      expect(a.open01).toBeGreaterThanOrEqual(0);
      expect(a.open01).toBeLessThanOrEqual(1);
      if (a.boat) {
        sawBoat = true;
        expect(a.boat.t01).toBeGreaterThanOrEqual(0);
        expect(a.boat.t01).toBeLessThanOrEqual(1);
        expect([1, -1]).toContain(a.boat.dir);
        expect(a.boat).toEqual(b.boat);
      }
    }
    expect(sawBoat).toBe(true);
  });

  it("only floats a boat around an opening, never through a closed span", () => {
    const start = at("2026-08-22T17:00:00Z").getTime();
    for (let ms = start; ms < start + 3600_000; ms += 5_000) {
      const { open01, boat } = bridgeStateAt(new Date(ms));
      // A boat mid-crossing means the leaves are up.
      if (boat && boat.t01 > 0.35 && boat.t01 < 0.65) {
        expect(open01).toBe(1);
      }
    }
  });
});

describe("overrides", () => {
  it("off welds the span shut through a scheduled opening", () => {
    setBridgeOverride("off");
    const start = at("2026-08-22T17:00:00Z").getTime();
    for (let ms = start; ms < start + 3600_000; ms += 20_000) {
      expect(bridgeState(new Date(ms)).open01).toBe(0);
    }
  });

  it("on loops openings even inside the rush window", () => {
    setBridgeOverride("on");
    // Wednesday 8:00 PDT — honestly restricted; the demo pin lifts the gate.
    const start = at("2026-08-19T15:00:00Z").getTime();
    let peak = 0;
    for (let s = 0; s < SLOT_S; s += 5) {
      peak = Math.max(peak, bridgeState(new Date(start + s * 1000)).open01);
    }
    expect(peak).toBe(1);
  });
});
