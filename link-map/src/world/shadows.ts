// Wash-shadows: a soft pigment shade cast BENEATH the translucent paper by
// everything that floats above it — the trains (#34), and the boats, planes,
// towers and the Needle (#41). Not a real depth-buffer shadow: a painter's
// blot, drawn under the paper (renderOrder 3, like the tunnels) and seen
// through it dimmed, so it reads as shade you feel rather than a hard disc.
//
// Casters push a request each frame; Shadows.tsx — mounted AFTER every caster
// — reads the queue, draws it, then clears it (resetShadows) for the next
// frame. The registry is a plain preallocated buffer: the hot path never
// touches React, matching the trains' TRAIN_MODEL contract.
//
// Height shapes the blot the way a wash spreads with the light's distance: a
// higher object floats a bigger, fainter, farther-offset shadow; an object
// buried below the paper (a tunnel train) casts almost nothing.

export const MAX_SHADOWS = 128;

interface ShadowQueue {
  x: Float32Array;
  z: Float32Array;
  radius: Float32Array;
  strength: Float32Array;
  count: number;
}

export const SHADOWS: ShadowQueue = {
  x: new Float32Array(MAX_SHADOWS),
  z: new Float32Array(MAX_SHADOWS),
  radius: new Float32Array(MAX_SHADOWS),
  strength: new Float32Array(MAX_SHADOWS),
  count: 0,
};

// The scene's fixed key sits in the northwest sky (matching Landmarks' massing
// light), so every shadow falls toward the southeast, farther the higher the
// caster rides.
const LIGHT_XZ_X = 0.5;
const LIGHT_XZ_Z = 0.45;

/**
 * Queue one shadow. `height` is km above the paper (negative = below it, e.g. a
 * tunnel train); `footKm` is the caster's own footprint radius.
 */
export function pushShadow(x: number, z: number, height: number, footKm: number, strength = 1) {
  const i = SHADOWS.count;
  if (i >= MAX_SHADOWS) return;
  const lift = Math.max(0, height);
  // Offset southeast, and grow + soften with height.
  SHADOWS.x[i] = x + LIGHT_XZ_X * lift * 0.8;
  SHADOWS.z[i] = z + LIGHT_XZ_Z * lift * 0.8;
  SHADOWS.radius[i] = footKm + lift * 0.4 + 0.05;
  // Fade: strongest for an object resting just over the paper, thinning as it
  // lifts (the wash spreads) and all but gone once it sinks below the paper.
  const buried = Math.max(0, -height);
  const fade = Math.min(1, Math.max(0.12, 1 - buried * 4)) / (1 + lift);
  SHADOWS.strength[i] = strength * fade;
  SHADOWS.count = i + 1;
}

/** Consume the queue — called once per frame by Shadows.tsx after it draws. */
export function resetShadows() {
  SHADOWS.count = 0;
}
