import { describe, it, expect } from "vitest";
import {
  DEVICES,
  DEVICES_BY_ID,
  MAC_DEVICES,
  IPAD_DEVICES,
  computeConfig,
  priceContrast,
  percentChange,
  formatUSD,
  formatSigned,
} from "../pricing";

describe("pricing data integrity", () => {
  it("every device has sourced base prices that rose in the hike", () => {
    for (const d of DEVICES) {
      expect(d.basePrice.before).toBeGreaterThan(0);
      // Every affected product went up — none were cut.
      expect(d.basePrice.after).toBeGreaterThanOrEqual(d.basePrice.before);
      expect(d.basePrice.confidence).toBe("sourced");
      expect(Array.isArray(d.basePrice.sourceIds)).toBe(true);
      expect(d.basePrice.sourceIds.length).toBeGreaterThan(0);
    }
  });

  it("the base config is always an Included (zero-upcharge) rung", () => {
    for (const d of DEVICES) {
      const memBase = d.memory.find((r) => r.gb === d.base.memory);
      const storBase = d.storage.find((r) => r.gb === d.base.storage);
      if (d.memory.length) {
        expect(memBase, `${d.id} memory base`).toBeTruthy();
        expect(memBase.add.before).toBe(0);
        expect(memBase.add.after).toBe(0);
      }
      expect(storBase, `${d.id} storage base`).toBeTruthy();
      expect(storBase.add.before).toBe(0);
      expect(storBase.add.after).toBe(0);
    }
  });

  it("upgrade rungs are modeled and never cheaper after the hike", () => {
    for (const d of DEVICES) {
      for (const rung of [...d.memory, ...d.storage]) {
        if (rung.add.before === 0) continue;
        expect(rung.confidence).toBe("modeled");
        expect(rung.add.after).toBeGreaterThanOrEqual(rung.add.before);
      }
    }
  });

  it("has unique ids and is split into the two product lines", () => {
    const ids = DEVICES.map((d) => d.id);
    expect(new Set(ids).size).toBe(DEVICES.length);
    expect(MAC_DEVICES.length + IPAD_DEVICES.length).toBe(DEVICES.length);
  });
});

describe("price computation", () => {
  const mbp = DEVICES_BY_ID["macbook-pro-14-m5"];

  it("computes the sourced base contrast exactly", () => {
    const base = { memory: mbp.base.memory, storage: mbp.base.storage };
    expect(computeConfig(mbp, base, "before").total).toBe(1699);
    expect(computeConfig(mbp, base, "after").total).toBe(1999);
    const c = priceContrast(mbp, base);
    expect(c.delta.total).toBe(300);
    expect(c.hasModeled).toBe(false);
  });

  it("adds upgrade rungs into both eras and widens the gap", () => {
    const upgraded = { memory: 32, storage: 2048 };
    const c = priceContrast(mbp, upgraded);
    // before: 1699 + 400 (32GB) + 400 (2TB) = 2499
    expect(c.before.total).toBe(2499);
    // after: 1999 + 440 (modeled 32GB) + 440 (modeled 2TB) = 2879
    expect(c.after.total).toBe(2879);
    expect(c.delta.total).toBe(380);
    expect(c.hasModeled).toBe(true);
  });

  it("treats an unknown rung as a zero upcharge rather than NaN", () => {
    const weird = { memory: 999, storage: 999 };
    expect(computeConfig(mbp, weird, "after").total).toBe(mbp.basePrice.after);
  });
});

describe("formatters", () => {
  it("formats whole-dollar USD with separators", () => {
    expect(formatUSD(1999)).toBe("$1,999");
    expect(formatUSD(2879.4)).toBe("$2,879");
  });

  it("formats signed deltas with a real minus glyph", () => {
    expect(formatSigned(300)).toBe("+$300");
    expect(formatSigned(-50)).toBe("−$50");
  });

  it("computes percent change safely", () => {
    expect(Math.round(percentChange(1699, 1999))).toBe(18);
    expect(percentChange(0, 100)).toBe(0);
  });
});
