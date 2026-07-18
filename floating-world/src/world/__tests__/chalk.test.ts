// The sidewalk chalk's pure half: the summer-weekend calendar, the weekend id
// that pairs Saturday with its Sunday, the deterministic pastel tray, the
// appearance gate, the chosen path, and the seeded scribble generator.

import { describe, it, expect } from "vitest";
import {
  CHALK_PIGMENTS,
  CHALK_PATHS,
  isSummerWeekend,
  weekendId,
  weekendAppears,
  chalkTray,
  pickPath,
  buildScribbles,
  chalkForDate,
} from "../chalk";

// Local-time constructor (chalk seeds off local Y/M/D like the Gum Wall). July
// 2026: the 18th is a Saturday, the 19th a Sunday.
const d = (y: number, mZeroBased: number, day: number) => new Date(y, mZeroBased, day);

describe("sidewalk chalk", () => {
  it("only summer (Jun–Aug) Saturdays and Sundays are eligible weekends", () => {
    expect(isSummerWeekend(d(2026, 6, 18))).toBe(true); // Sat, July
    expect(isSummerWeekend(d(2026, 6, 19))).toBe(true); // Sun, July
    expect(isSummerWeekend(d(2026, 6, 17))).toBe(false); // Fri, July
    expect(isSummerWeekend(d(2026, 5, 6))).toBe(true); // Sat, June
    expect(isSummerWeekend(d(2026, 7, 30))).toBe(true); // Sun, August
    expect(isSummerWeekend(d(2026, 8, 5))).toBe(false); // Sat, September — out of season
    expect(isSummerWeekend(d(2026, 0, 3))).toBe(false); // Sat, January — out of season
  });

  it("a weekend's Saturday and Sunday share one id (one drawing for the weekend)", () => {
    const sat = weekendId(d(2026, 6, 18));
    const sun = weekendId(d(2026, 6, 19));
    expect(sat).toBe(sun);
    // A different weekend is a different id.
    expect(weekendId(d(2026, 6, 25))).not.toBe(sat);
  });

  it("the pastel tray is deterministic per weekend, four chalks under the bloom ceiling", () => {
    const id = weekendId(d(2026, 6, 18));
    const a = chalkTray(id);
    const b = chalkTray(id);
    expect(a).toEqual(b);
    expect(a).toHaveLength(4);
    expect(new Set(a).size).toBe(4);
    for (const c of a) expect(CHALK_PIGMENTS).toContain(c);
    // Bright-paper bloom rule: every pastel channel stays under ~#f2.
    for (const c of CHALK_PIGMENTS) {
      for (let ch = 0; ch < 3; ch++) {
        expect(parseInt(c.slice(1 + ch * 2, 3 + ch * 2), 16)).toBeLessThanOrEqual(0xf2);
      }
    }
  });

  it("only some summer weekends appear — absence, not every weekend", () => {
    let appears = 0;
    let total = 0;
    // Walk every Saturday of a year; count how many summer ones draw chalk.
    for (let day = 0; day < 366; day++) {
      const date = new Date(2026, 0, 3 + day); // Jan 3 2026 is a Saturday
      if (date.getDay() !== 6) continue;
      if (!isSummerWeekend(date)) continue;
      total++;
      if (weekendAppears(weekendId(date))) appears++;
    }
    expect(total).toBeGreaterThan(8); // ~13 summer Saturdays
    // Some do, some don't — never all-or-nothing.
    expect(appears).toBeGreaterThan(0);
    expect(appears).toBeLessThan(total);
  });

  it("picks a real park path, deterministically", () => {
    const id = weekendId(d(2026, 6, 18));
    const p = pickPath(id);
    expect(pickPath(id)).toEqual(p);
    expect(CHALK_PATHS).toContain(p);
  });

  it("scribbles are deterministic in the weekend and stay inside the patch", () => {
    const id = weekendId(d(2026, 6, 18));
    const tray = chalkTray(id);
    const a = buildScribbles(id, tray);
    const b = buildScribbles(id, tray);
    expect(a).toEqual(b); // same weekend → same drawing (two tabs agree)
    expect(a.length).toBeGreaterThan(0);
    for (const s of a) {
      expect(s.pts.length).toBeGreaterThanOrEqual(2);
      expect(tray).toContain(s.color); // colored from the weekend's tray
      for (const [x, y] of s.pts) {
        // Patch-local coords: comfortably within the ±1 patch (slots + radius).
        expect(Math.abs(x)).toBeLessThanOrEqual(1.2);
        expect(Math.abs(y)).toBeLessThanOrEqual(1.2);
        expect(Number.isFinite(x)).toBe(true);
        expect(Number.isFinite(y)).toBe(true);
      }
    }
    // A different weekend draws a different picture.
    const other = buildScribbles(weekendId(d(2026, 6, 25)), tray);
    expect(other).not.toEqual(a);
  });

  it("chalkForDate: a dry-season weekend draws, an out-of-season day does not", () => {
    const summer = chalkForDate(d(2026, 6, 18));
    expect(summer.scribbles.length).toBeGreaterThan(0);
    expect(summer.path).toBeDefined();
    // appears matches the season+gate; either way the drawing is available so
    // ?chalk=on can force a patch off-season.
    const winter = chalkForDate(d(2026, 0, 3));
    expect(winter.appears).toBe(false);
    expect(winter.scribbles.length).toBeGreaterThan(0);
  });
});
