import type { Vector3 } from "three";
import { ZONES } from "./crew";

// Static furniture footprints — cheap circle colliders on the deck plane.
// Cats, drifting cats, and rolling/drifting props all resolve against these,
// so nothing walks (or floats) through the cat tree, the scratching posts, or
// the consoles. `h` caps the collider: things drifting above it clear it.
// Duty-console footprints derive from ZONES so a console can never drift
// away from its own collider.

export interface CircleCollider {
  x: number;
  z: number;
  r: number;
  h: number;
}

export const COLLIDERS: CircleCollider[] = [
  { x: -4.5, z: -2.5, r: 0.72, h: 2.6 }, // cat tree
  { x: 5.2, z: 3.6, r: 0.55, h: 0.35 }, // food station console
  { x: -3.3, z: -1.2, r: 0.13, h: 1.0 }, // scratching post A
  { x: 2.9, z: 2.9, r: 0.13, h: 1.0 }, // scratching post B
  { x: ZONES.command.x, z: ZONES.command.z, r: 0.6, h: 0.85 }, // command console
  { x: ZONES.engineering.x, z: ZONES.engineering.z, r: 0.5, h: 1.0 }, // spin-governor console
  { x: ZONES.medbay.x, z: ZONES.medbay.z, r: 0.55, h: 0.75 }, // med-bay scanner bed
  { x: ZONES.comms.x, z: ZONES.comms.z, r: 0.5, h: 0.95 }, // comms rig
  { x: ZONES.hydroponics.x, z: ZONES.hydroponics.z, r: 0.55, h: 1.7 }, // hydroponics rack
  { x: ZONES.cargo.x, z: ZONES.cargo.z, r: 0.62, h: 1.15 }, // cargo crate stack
];

// Where the sisal is. Cats walk to an approach point beside a post, square up
// to it, rise on their hind legs, and get their claws in.
export const SCRATCH_POSTS: [number, number][] = [
  [-3.3, -1.2],
  [2.9, 2.9],
];

/** Push a point out of every furniture circle (xz only; skips colliders the
 *  point is above). Returns the last hit's outward normal for bounce
 *  responses, or null if nothing was touched. */
export function resolveCircles(
  pos: Vector3,
  radius: number
): { nx: number; nz: number } | null {
  let hit: { nx: number; nz: number } | null = null;
  for (const c of COLLIDERS) {
    if (pos.y > c.h) continue;
    const dx = pos.x - c.x;
    const dz = pos.z - c.z;
    const min = c.r + radius;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min) continue;
    const d = Math.sqrt(d2) || 1e-6;
    const nx = dx / d;
    const nz = dz / d;
    pos.x = c.x + nx * min;
    pos.z = c.z + nz * min;
    hit = { nx, nz };
  }
  return hit;
}
