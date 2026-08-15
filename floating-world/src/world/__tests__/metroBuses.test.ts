// The live bus layer's pure half (world/metroBuses.ts): livery assignment,
// the painted-page clip, the nearest-to-the-heart cap, bearing→yaw, and the
// glide step toward a fix.

import { describe, it, expect } from "vitest";
import {
  LIVERY_GREEN,
  LIVERY_BLUE,
  LIVERY_RED,
  ARTIC_SHARE,
  articFor,
  hashId,
  liveryFor,
  onPage,
  PAGE_BOUNDS,
  capByHeart,
  yawFromBearing,
  stepGlide,
} from "../metroBuses";

describe("livery assignment", () => {
  it("RapidRide is data — the rr flag always wins", () => {
    expect(liveryFor("1_6222", true)).toBe(LIVERY_RED);
    expect(liveryFor("anything", true)).toBe(LIVERY_RED);
  });

  it("green/blue is a deterministic per-vehicle hash with a minority blue share", () => {
    // Same coach, same coat, every time.
    expect(liveryFor("1_4808", false)).toBe(liveryFor("1_4808", false));
    // Across a fleet-sized sample: mostly green, a real minority blue, no red.
    let blue = 0;
    const n = 1000;
    for (let i = 0; i < n; i++) {
      const livery = liveryFor(`1_${4000 + i}`, false);
      expect(livery).not.toBe(LIVERY_RED);
      if (livery === LIVERY_BLUE) blue++;
    }
    expect(blue / n).toBeGreaterThan(0.08);
    expect(blue / n).toBeLessThan(0.3);
  });

  it("hashId is deterministic and 0..1", () => {
    expect(hashId("1_4808")).toBe(hashId("1_4808"));
    expect(hashId("1_4808")).not.toBe(hashId("1_4809"));
    for (const id of ["a", "1_100", "long-vehicle-identifier"]) {
      const h = hashId(id);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(1);
    }
  });
});

describe("coach length", () => {
  it("every RapidRide coach is a 60-foot artic — true of the real fleet", () => {
    expect(articFor("1_6222", true)).toBe(true);
    expect(articFor("anything", true)).toBe(true);
  });

  it("otherwise length is a deterministic hash near the fleet's artic share", () => {
    // Same coach, same length, every time.
    expect(articFor("1_4808", false)).toBe(articFor("1_4808", false));
    let artics = 0;
    const n = 1000;
    for (let i = 0; i < n; i++) {
      if (articFor(`1_${4000 + i}`, false)) artics++;
    }
    expect(artics / n).toBeGreaterThan(ARTIC_SHARE - 0.1);
    expect(artics / n).toBeLessThan(ARTIC_SHARE + 0.1);
  });

  it("length never correlates with livery — the hash is salted", () => {
    // Across a fleet, every (livery, length) pairing occurs: green standards,
    // green artics, blue standards, blue artics.
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const id = `1_${4000 + i}`;
      seen.add(`${liveryFor(id, false)}:${articFor(id, false)}`);
    }
    expect(seen.has(`${LIVERY_GREEN}:true`)).toBe(true);
    expect(seen.has(`${LIVERY_GREEN}:false`)).toBe(true);
    expect(seen.has(`${LIVERY_BLUE}:true`)).toBe(true);
    expect(seen.has(`${LIVERY_BLUE}:false`)).toBe(true);
  });
});

describe("painted-page clip", () => {
  it("keeps downtown and drops the far county", () => {
    expect(onPage(1.4, 0.4)).toBe(true); // Westlake
    expect(onPage(-20, 28)).toBe(true); // far corner, still on the sheet
    expect(onPage(PAGE_BOUNDS.x + 1, 0)).toBe(false); // past the east edge
    expect(onPage(0, -PAGE_BOUNDS.z - 5)).toBe(false); // Snohomish county line
  });
});

describe("capByHeart", () => {
  const bus = (id: string, x: number, z: number) => ({ id, x, z });

  it("under the cap, returns the list untouched", () => {
    const list = [bus("a", 0, 0), bus("b", 20, 20)];
    expect(capByHeart(list, 5, 1.4, 0.4)).toBe(list);
  });

  it("over the cap, keeps the coaches nearest the heart", () => {
    const list = [
      bus("far", 25, 25),
      bus("downtown", 1.5, 0.5),
      bus("mid", 8, 8),
      bus("edge", -20, -28),
    ];
    const kept = capByHeart(list, 2, 1.4, 0.4);
    expect(kept.map((b) => b.id)).toEqual(["downtown", "mid"]);
    // Deterministic: same input, same kept set.
    expect(capByHeart(list, 2, 1.4, 0.4)).toEqual(kept);
  });
});

describe("bearing → yaw", () => {
  // Scene axes: +x east, +z south. The bus model noses along +X; yaw is
  // atan2(-z, x) like every map layer.
  it("maps the compass onto the scene", () => {
    // East: direction (1, 0) → yaw 0.
    expect(yawFromBearing(90)).toBeCloseTo(0, 10);
    // North: direction (0, -1) → yaw π/2.
    expect(yawFromBearing(0)).toBeCloseTo(Math.PI / 2, 10);
    // South: yaw -π/2; west: |yaw| = π.
    expect(yawFromBearing(180)).toBeCloseTo(-Math.PI / 2, 10);
    expect(Math.abs(yawFromBearing(270))).toBeCloseTo(Math.PI, 10);
  });
});

describe("stepGlide", () => {
  const cfg = { ratePerS: 0.35, snapKm: 1.2, fadeInS: 1.5 };

  it("eases toward the fix without overshooting", () => {
    let p = { x: 0, z: 0 };
    const before = Math.hypot(0.5 - p.x, 0.2 - p.z);
    p = stepGlide(p.x, p.z, 0.5, 0.2, 1 / 60, cfg);
    const after = Math.hypot(0.5 - p.x, 0.2 - p.z);
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(0); // never teleports inside snap range
  });

  it("converges most of the way over a poll gap", () => {
    let p = { x: 0, z: 0 };
    for (let i = 0; i < 600; i++) p = stepGlide(p.x, p.z, 0.5, 0.2, 1 / 60, cfg); // 10 s
    // 1 - e^(-0.35 * 10) ≈ 0.97 of the way there.
    expect(Math.hypot(0.5 - p.x, 0.2 - p.z)).toBeLessThan(0.03);
  });

  it("snaps when the gap is too wide to interpolate honestly", () => {
    const p = stepGlide(0, 0, 5, 5, 1 / 60, cfg);
    expect(p).toEqual({ x: 5, z: 5 });
  });
});
