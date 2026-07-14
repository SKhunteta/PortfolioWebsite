// #21 — the paper remembers being touched. Where a train has recently passed,
// the paper stays faintly warm and damp and only slowly dries back, so the
// busy trunk downtown reads lived-in while the sleepy tails stay crisp.
//
// This is NOT the trails (those are a few seconds of glow, a position history);
// it's a slow stain that lingers a minute or two — accumulation, not history.
// A small low-res field in world XZ: trains stamp warmth as they pass, the
// whole field eases back toward dry each frame, and the GroundPlane samples it.
// Kept off the render-target path on purpose — a 128² CPU grid uploaded as a
// DataTexture is cheaper and fully deterministic (no ping-pong, no extra pass).

import * as THREE from "three";
import { STATIONS } from "../map/network";

// The field covers the whole 2-Line sprawl (~66 km north–south), so it needs
// resolution to keep the rail stain from reading as coarse blocks. 256² is 64k
// cells — the per-frame decay + upload is still trivial.
const RES = 256;
const STAIN_TAU_S = 90; // how long the damp lingers before it dries back
const STAIN_RATE = 0.05; // warmth laid down per second a train sits over a cell
const MAX_STAIN = 1;

// World bounds: the station spread, padded, so the field covers every rail.
function computeBounds() {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const s of STATIONS) {
    minX = Math.min(minX, s.x);
    maxX = Math.max(maxX, s.x);
    minZ = Math.min(minZ, s.z);
    maxZ = Math.max(maxZ, s.z);
  }
  const padX = (maxX - minX) * 0.08 + 1;
  const padZ = (maxZ - minZ) * 0.08 + 1;
  return {
    minX: minX - padX,
    minZ: minZ - padZ,
    sizeX: maxX - minX + 2 * padX,
    sizeZ: maxZ - minZ + 2 * padZ,
  };
}

const B = computeBounds();
export const STAIN_MIN = new THREE.Vector2(B.minX, B.minZ);
export const STAIN_SIZE = new THREE.Vector2(B.sizeX, B.sizeZ);

// Accumulator holds the true 0..1 stain; the texture is an R8 mirror uploaded
// each frame. R8 is universally linear-filterable — a FloatType data texture is
// NOT guaranteed sampleable-with-LinearFilter under WebGL2, which silently
// blanks the stain on some GPUs (and SwiftShader).
const acc = new Float32Array(RES * RES);
const tex = new Uint8Array(RES * RES);
export const STAIN_TEX = new THREE.DataTexture(tex, RES, RES, THREE.RedFormat, THREE.UnsignedByteType);
STAIN_TEX.minFilter = THREE.LinearFilter;
STAIN_TEX.magFilter = THREE.LinearFilter;
STAIN_TEX.wrapS = THREE.ClampToEdgeWrapping;
STAIN_TEX.wrapT = THREE.ClampToEdgeWrapping;
STAIN_TEX.needsUpdate = true;

/** Warm the paper where a train sits, splatting a soft 3×3 so the stain has
 *  width along the rail. `dt` seconds — framerate-independent. */
export function stampStain(x: number, z: number, dt: number) {
  const u = (x - B.minX) / B.sizeX;
  const v = (z - B.minZ) / B.sizeZ;
  if (u < 0 || u > 1 || v < 0 || v > 1) return;
  const ix = Math.round(u * (RES - 1));
  const iy = Math.round(v * (RES - 1));
  const amount = STAIN_RATE * dt;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const gx = ix + dx;
      const gy = iy + dy;
      if (gx < 0 || gx >= RES || gy < 0 || gy >= RES) continue;
      const w = dx === 0 && dy === 0 ? 1 : 0.5;
      const idx = gy * RES + gx;
      acc[idx] = Math.min(MAX_STAIN, acc[idx] + amount * w);
    }
  }
}

/** Ease the whole field back toward dry, mirror it into the R8 texture, and
 *  flag it for upload. Single driver only (Trains.tsx), once per frame. */
export function decayStain(dt: number) {
  const k = Math.exp(-dt / STAIN_TAU_S);
  for (let i = 0; i < acc.length; i++) {
    const v = acc[i] * k;
    acc[i] = v;
    tex[i] = v > 0.999 ? 255 : (v * 255) | 0;
  }
  STAIN_TEX.needsUpdate = true;
}
