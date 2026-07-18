// The Gum Wall's pure half: the date-seeded day palette, the localStorage
// round-trip (via an injected storage), and the capacity/steam-clean rule.

import { describe, it, expect } from "vitest";
import {
  PIGMENTS,
  WALL_CAPACITY,
  dayPigments,
  loadDots,
  saveDots,
  commitDot,
  GumDot,
  DotStorage,
} from "../gumwall";

function memStorage(): DotStorage & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

const dot = (i: number): GumDot => ({
  u: (i % 10) / 10,
  v: 0.5,
  c: PIGMENTS[i % PIGMENTS.length],
  t: 1750000000000 + i,
});

describe("gum wall", () => {
  it("day palette is deterministic per date, four saturated pigments from the tray", () => {
    const a = dayPigments(new Date(2026, 6, 18));
    const b = dayPigments(new Date(2026, 6, 18));
    expect(a).toEqual(b);
    expect(a).toHaveLength(4);
    expect(new Set(a).size).toBe(4);
    for (const c of a) expect(PIGMENTS).toContain(c);
    // Every pigment respects the bright-paper bloom ceiling (~#f2/channel).
    for (const c of PIGMENTS) {
      for (let ch = 0; ch < 3; ch++) {
        expect(parseInt(c.slice(1 + ch * 2, 3 + ch * 2), 16)).toBeLessThanOrEqual(0xf2);
      }
    }
  });

  it("different dates draw different trays (the wall ages in day-batches)", () => {
    const days = new Set<string>();
    for (let d = 1; d <= 14; d++) days.add(dayPigments(new Date(2026, 6, d)).join(","));
    expect(days.size).toBeGreaterThan(1);
  });

  it("dots round-trip through storage and survive garbage", () => {
    const storage = memStorage();
    const dots = [dot(0), dot(1), dot(2)];
    saveDots(dots, storage);
    expect(loadDots(storage)).toEqual(dots);
    // Corrupt/hostile payloads never throw and never leak bad records.
    storage.data["soundrail.gumwall.v1"] = "not json";
    expect(loadDots(storage)).toEqual([]);
    storage.data["soundrail.gumwall.v1"] = JSON.stringify({
      dots: [{ u: NaN, v: 0.5, c: "#123456", t: 1 }, { u: 0.5, v: 0.5, c: "javascript:", t: 1 }, dot(4)],
    });
    expect(loadDots(storage)).toEqual([dot(4)]);
    expect(loadDots(null)).toEqual([]); // no storage: the wall lives one visit
  });

  it("presses accumulate to capacity, then the steam-clean starts the wall over", () => {
    let wall: GumDot[] = [];
    for (let i = 0; i < WALL_CAPACITY; i++) {
      const r = commitDot(wall, dot(i));
      expect(r.cleaned).toBe(false);
      wall = r.dots;
    }
    expect(wall).toHaveLength(WALL_CAPACITY);
    const r = commitDot(wall, dot(9999));
    expect(r.cleaned).toBe(true);
    expect(r.dots).toEqual([dot(9999)]); // bare brick + the first new piece
    expect(wall).toHaveLength(WALL_CAPACITY); // input never mutated
  });
});
