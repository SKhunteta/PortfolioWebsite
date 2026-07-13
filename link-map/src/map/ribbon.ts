// Soft strip geometry shared by everything ribbon-shaped: Link lines, road
// strokes, watercolor shoreline edges. Triangle strips with averaged-tangent
// miters — fine for gently curved, pre-simplified polylines. uv.x carries
// arc length in km (or normalized 0..1), uv.y crosses the strip 0..1.
//
// Winding faces DOWN (-Y); every material using these must be DoubleSide
// (that bug has bitten once already).

import * as THREE from "three";

export interface StripOptions {
  widthKm: number;
  y: number;
  ys?: number[]; // per-vertex height (grade ramps); falls back to `y` when absent
  closed?: boolean; // wraparound tangents + closing segment (rings)
  normalizeU?: boolean; // uv.x 0..1 over the strip instead of km
}

export function buildStrip(points: [number, number][], opts: StripOptions): THREE.BufferGeometry {
  const closed = Boolean(opts.closed);
  const pts = closed ? [...points, points[0]] : points;
  const n = pts.length;
  const half = opts.widthKm / 2;

  // Cumulative km for uv.x.
  const cum = new Float32Array(n);
  for (let i = 1; i < n; i++) {
    cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  const total = cum[n - 1] || 1;

  const positions = new Float32Array(n * 2 * 3);
  const uvs = new Float32Array(n * 2 * 2);
  const indices: number[] = [];

  const wrap = (i: number) => (closed ? (i + (n - 1)) % (n - 1) : Math.max(0, Math.min(n - 1, i)));

  for (let i = 0; i < n; i++) {
    const prev = pts[wrap(i - 1)];
    const next = pts[wrap(i + 1)];
    let tx = next[0] - prev[0];
    let tz = next[1] - prev[1];
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    const px = -tz;
    const pz = tx;
    const u = opts.normalizeU ? cum[i] / total : cum[i];
    const y = opts.ys ? opts.ys[i] : opts.y;
    const base = i * 6;
    positions[base] = pts[i][0] + px * half;
    positions[base + 1] = y;
    positions[base + 2] = pts[i][1] + pz * half;
    positions[base + 3] = pts[i][0] - px * half;
    positions[base + 4] = y;
    positions[base + 5] = pts[i][1] - pz * half;
    uvs[i * 4] = u;
    uvs[i * 4 + 1] = 0;
    uvs[i * 4 + 2] = u;
    uvs[i * 4 + 3] = 1;
    if (i < n - 1) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

/** Concatenate strips into one geometry (one draw call for a whole layer). */
export function mergeStrips(strips: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let vertCount = 0;
  let indexCount = 0;
  for (const g of strips) {
    vertCount += g.getAttribute("position").count;
    indexCount += g.getIndex()!.count;
  }
  const positions = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const indices = new Uint32Array(indexCount);
  let vOff = 0;
  let iOff = 0;
  for (const g of strips) {
    const p = g.getAttribute("position");
    const u = g.getAttribute("uv");
    const idx = g.getIndex()!;
    positions.set(p.array as Float32Array, vOff * 3);
    uvs.set(u.array as Float32Array, vOff * 2);
    for (let i = 0; i < idx.count; i++) indices[iOff + i] = idx.getX(i) + vOff;
    vOff += p.count;
    iOff += idx.count;
    g.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  return merged;
}
