import { DataTexture, RGBAFormat, RepeatWrapping, UnsignedByteType } from "three";
import { createNoise2D } from "simplex-noise";
import { mulberry32 } from "../world/rng";

// Procedural detail textures (no external assets — everything on Meow-9 is
// code-generated). A tileable FBM heightfield becomes a tangent-space normal
// map (surface chisel for the cats' fur break-up, panel grain for the
// station hull) and a matching roughness map.

/** Tileable FBM: sample the noise on a torus embedded in 4D-ish (two circles). */
function tileableFbm(size: number, scale: number, octaves: number, seed: number): Float32Array {
  const noiseA = createNoise2D(mulberry32(seed));
  const noiseB = createNoise2D(mulberry32(seed + 101));
  const field = new Float32Array(size * size);
  const TAU = Math.PI * 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * TAU;
      const v = (y / size) * TAU;
      // Torus trick: two 2D noise reads on circle coordinates tile perfectly.
      const cx = Math.cos(u) * scale;
      const sx = Math.sin(u) * scale;
      const cy = Math.cos(v) * scale;
      const sy = Math.sin(v) * scale;
      let amp = 1;
      let freq = 1;
      let sum = 0;
      let norm = 0;
      for (let o = 0; o < octaves; o++) {
        sum += amp * (noiseA(cx * freq, cy * freq) + noiseB(sx * freq, sy * freq)) * 0.5;
        norm += amp;
        amp *= 0.5;
        freq *= 2.1;
      }
      field[y * size + x] = sum / norm; // roughly [-1, 1]
    }
  }
  return field;
}

/** Tangent-space normal map from a tileable FBM heightfield. */
export function makeNoiseNormalMap(size = 256, scale = 3, strength = 1.5, seed = 7): DataTexture {
  const h = tileableFbm(size, scale, 4, seed);
  const data = new Uint8Array(size * size * 4);
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      data[i] = ((-dx * inv) * 0.5 + 0.5) * 255;
      data[i + 1] = ((-dy * inv) * 0.5 + 0.5) * 255;
      data[i + 2] = (inv * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const tex = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** Grayscale roughness map from the same FBM family, remapped to [lo, hi]. */
export function makeNoiseRoughnessMap(size = 256, scale = 3, lo = 0.4, hi = 0.7, seed = 23): DataTexture {
  const h = tileableFbm(size, scale, 4, seed);
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = (lo + (hi - lo) * (h[i] * 0.5 + 0.5)) * 255;
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}
