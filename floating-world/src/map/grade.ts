// The rail's height along a line. GTFS carries no vertical geometry, so the
// tunnel/at-grade/elevated heights are discrete artistic annotations
// (CONFIG.ribbon.y). Left as hard steps they make the line teleport 0.2–0.5 km
// straight up at every portal — a broken-looking vertical seam. This module
// turns the step function into a continuous, eased profile: flat through the
// body of each grade, a smoothstep ramp across every boundary. The line
// ribbons AND the trains both read it, so a train stays glued to the track it
// rides instead of floating off during a transition.

import type { DirectionGeometry } from "./network";
import { CONFIG } from "../world/config";

// Ramp half-width (km) on each side of a boundary, clamped so a short segment
// can't be overrun from both ends (the two ramps would otherwise fight).
const RAMP_HALF_KM = 0.45;

interface Boundary {
  s: number;
  before: number;
  after: number;
  half: number;
}

function buildHeightProfile(dir: DirectionGeometry): (s: number) => number {
  const grades = dir.grades;
  const flat = (grade: string) => CONFIG.ribbon.y[grade];
  const boundaries: Boundary[] = [];
  for (let i = 1; i < grades.length; i++) {
    const before = flat(grades[i - 1].grade);
    const after = flat(grades[i].grade);
    if (Math.abs(before - after) < 1e-6) continue;
    const segBefore = grades[i - 1].toKm - grades[i - 1].fromKm;
    const segAfter = grades[i].toKm - grades[i].fromKm;
    const half = Math.min(RAMP_HALF_KM, segBefore / 2, segAfter / 2);
    boundaries.push({ s: grades[i].fromKm, before, after, half });
  }

  // Clamp out-of-range s to the end grades instead of defaulting to at-grade —
  // a train whose sRendered rounds just past the last grade must not pop to
  // ground level at a portal or line end.
  const last = grades[grades.length - 1];
  const gradeHeightAt = (s: number) => {
    if (s <= grades[0].fromKm) return flat(grades[0].grade);
    if (s >= last.toKm) return flat(last.grade);
    for (const g of grades) if (s >= g.fromKm && s <= g.toKm) return flat(g.grade);
    return flat(last.grade);
  };

  return (s: number) => {
    for (const b of boundaries) {
      if (s > b.s - b.half && s < b.s + b.half) {
        const t = (s - (b.s - b.half)) / (2 * b.half);
        const e = t * t * (3 - 2 * t); // smoothstep
        return b.before + (b.after - b.before) * e;
      }
    }
    return gradeHeightAt(s);
  };
}

// One profile per direction, cached by reference (the poller hands trains the
// same DirectionGeometry objects the ribbons are built from).
const cache = new WeakMap<DirectionGeometry, (s: number) => number>();

/** Eased rail height at arc length `s` along a direction. Pure per (dir, s) —
 *  ribbons on either side of a boundary evaluate it identically and meet. */
export function railHeightAt(dir: DirectionGeometry, s: number): number {
  let f = cache.get(dir);
  if (!f) {
    f = buildHeightProfile(dir);
    cache.set(dir, f);
  }
  return f(s);
}
