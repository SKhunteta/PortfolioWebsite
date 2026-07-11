import type { Vector3 } from "three";

// Static furniture footprints — cheap circle colliders on the deck plane.
// Cats, drifting cats, and rolling/drifting props all resolve against these,
// so nothing walks (or floats) through the cat tree, the scratching posts, or
// the food console. `h` caps the collider: things drifting above it clear it.

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
