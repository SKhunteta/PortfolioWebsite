// Bioluminescent wakes (#14): where the boats cut the water on warm, calm
// nights, the Sound wakes in a faint teal glow behind them. The ferries and
// water taxi each own a FIXED slot they overwrite every frame (world x/z +
// strength); Water.tsx reads all slots. Fixed slots — not a reset-queue — so
// the caster/consumer frame order doesn't matter (Water is mounted before the
// ferries) and nothing has to be cleared.

import * as THREE from "three";

export const MAX_WAKES = 3; // two Bainbridge boats + the water taxi

// vec3 per slot: (x, z) world position, z-component = strength 0..1. Handed
// straight to the shader as a vec3 array uniform.
export const WAKES: THREE.Vector3[] = Array.from(
  { length: MAX_WAKES },
  () => new THREE.Vector3(0, 0, 0)
);

export function setWake(slot: number, x: number, z: number, strength: number) {
  if (slot < 0 || slot >= MAX_WAKES) return;
  WAKES[slot].set(x, z, strength);
}
