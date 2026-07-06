import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  MeshStandardMaterial,
  Vector2,
} from "three";
import { sampleTerrain, type TerrainSample } from "./heightfield";
import { biomeColor } from "./biome";
import { TERRAIN } from "../world/config";
import { useWorldClock } from "../world/WorldClock";
import { dayness } from "../world/sun";
import { PALETTE, mix } from "../world/palettes";

// Milestone 3: chunked LOD terrain.
// A camera-centered quadtree over the (implicit, infinite) heightfield. Tiles are
// aligned to an absolute power-of-two grid so their keys — and cached geometries —
// stay stable as the camera moves; only newly-exposed tiles get built. LOD cracks
// between neighboring depths are hidden with vertical skirts (geomorphing can come
// later if the skirts ever read badly). CPU noise is fast enough here: a full tile
// set builds in well under a second, and steady-state rebuilds touch a few tiles.
//
// Season handling honors the WorldClock contract: chunks are season-agnostic
// (Bright-neutral vertex colors); a single material tint derived from dayness()
// does the Bright/Dark crossfade every frame.

interface Tile {
  x: number; // min-corner, world meters
  z: number;
  size: number;
  key: string;
}

// --- Quadtree ---------------------------------------------------------------

function tilesForCamera(camX: number, camZ: number): Tile[] {
  const tiles: Tile[] = [];
  const R = TERRAIN.rootSize;

  const recurse = (x: number, z: number, size: number) => {
    const dist = Math.hypot(camX - (x + size / 2), camZ - (z + size / 2));
    if (size > TERRAIN.minChunk && dist < size * TERRAIN.lodFactor) {
      const h = size / 2;
      recurse(x, z, h);
      recurse(x + h, z, h);
      recurse(x, z + h, h);
      recurse(x + h, z + h, h);
    } else {
      tiles.push({ x, z, size, key: `${x}_${z}_${size}` });
    }
  };

  // Cover a root-sized apron around the camera (up to 3x3 root cells) so the
  // horizon never runs off the edge of the world.
  const gx0 = Math.floor((camX - R) / R);
  const gx1 = Math.floor((camX + R) / R);
  const gz0 = Math.floor((camZ - R) / R);
  const gz1 = Math.floor((camZ + R) / R);
  for (let gz = gz0; gz <= gz1; gz++)
    for (let gx = gx0; gx <= gx1; gx++) recurse(gx * R, gz * R, R);

  return tiles;
}

// --- Chunk geometry ----------------------------------------------------------

/** Grid vertex indices along the tile perimeter, as one closed clockwise loop. */
function perimeterIndices(res: number): number[] {
  const idx: number[] = [];
  for (let i = 0; i < res - 1; i++) idx.push(i); // top row, left -> right
  for (let j = 0; j < res - 1; j++) idx.push(j * res + (res - 1)); // right col, down
  for (let i = res - 1; i > 0; i--) idx.push((res - 1) * res + i); // bottom, right -> left
  for (let j = res - 1; j > 0; j--) idx.push(j * res); // left col, up
  return idx;
}

/** Cheap deterministic ±1 hash for color dithering (breaks contour banding). */
function hash2(x: number, z: number): number {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

const sampleScratch: TerrainSample = { height: 0, coastal: 0, weld: 0, vent: 0, ice: 0 };
const colorScratch = new Color();

function buildChunkGeometry(tile: Tile): BufferGeometry {
  const res = TERRAIN.chunkRes;
  const step = tile.size / (res - 1);
  const pad = res + 2; // 1-vertex apron for finite-difference normals

  // Pass 1: sample the padded grid (heights everywhere, masks kept for interior).
  const heights = new Float32Array(pad * pad);
  const coastal = new Float32Array(pad * pad);
  const weld = new Float32Array(pad * pad);
  const vent = new Float32Array(pad * pad);
  const ice = new Float32Array(pad * pad);
  for (let j = 0; j < pad; j++) {
    for (let i = 0; i < pad; i++) {
      const s = sampleTerrain(tile.x + (i - 1) * step, tile.z + (j - 1) * step, sampleScratch);
      const p = j * pad + i;
      heights[p] = s.height;
      coastal[p] = s.coastal;
      weld[p] = s.weld;
      vent[p] = s.vent;
      ice[p] = s.ice;
    }
  }

  const perim = perimeterIndices(res);
  const gridCount = res * res;
  const vertCount = gridCount + perim.length;
  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const colors = new Float32Array(vertCount * 3);

  // Pass 2: interior vertices.
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const v = j * res + i;
      const p = (j + 1) * pad + (i + 1);
      const x = tile.x + i * step;
      const z = tile.z + j * step;

      positions[v * 3] = x;
      positions[v * 3 + 1] = heights[p];
      positions[v * 3 + 2] = z;

      // Heightfield normal via central differences on the padded grid.
      const nx = -(heights[p + 1] - heights[p - 1]) / (2 * step);
      const nz = -(heights[p + pad] - heights[p - pad]) / (2 * step);
      const inv = 1 / Math.hypot(nx, 1, nz);
      normals[v * 3] = nx * inv;
      normals[v * 3 + 1] = inv;
      normals[v * 3 + 2] = nz * inv;

      sampleScratch.height = heights[p];
      sampleScratch.coastal = coastal[p];
      sampleScratch.weld = weld[p];
      sampleScratch.vent = vent[p];
      sampleScratch.ice = ice[p];
      biomeColor(sampleScratch, hash2(x, z), colorScratch);
      colors[v * 3] = colorScratch.r;
      colors[v * 3 + 1] = colorScratch.g;
      colors[v * 3 + 2] = colorScratch.b;
    }
  }

  // Skirt vertices: perimeter copies dropped straight down, hiding LOD cracks.
  const skirtDepth = Math.max(12, tile.size * 0.03);
  for (let k = 0; k < perim.length; k++) {
    const src = perim[k];
    const dst = gridCount + k;
    positions[dst * 3] = positions[src * 3];
    positions[dst * 3 + 1] = positions[src * 3 + 1] - skirtDepth;
    positions[dst * 3 + 2] = positions[src * 3 + 2];
    normals[dst * 3] = normals[src * 3];
    normals[dst * 3 + 1] = normals[src * 3 + 1];
    normals[dst * 3 + 2] = normals[src * 3 + 2];
    colors[dst * 3] = colors[src * 3];
    colors[dst * 3 + 1] = colors[src * 3 + 1];
    colors[dst * 3 + 2] = colors[src * 3 + 2];
  }

  // Indices: grid quads (+y facing) then skirt quads (outward facing).
  const quadCount = (res - 1) * (res - 1) + perim.length;
  const indices = new Uint32Array(quadCount * 6);
  let w = 0;
  for (let j = 0; j < res - 1; j++) {
    for (let i = 0; i < res - 1; i++) {
      const a = j * res + i;
      indices[w++] = a;
      indices[w++] = a + res;
      indices[w++] = a + 1;
      indices[w++] = a + 1;
      indices[w++] = a + res;
      indices[w++] = a + res + 1;
    }
  }
  for (let k = 0; k < perim.length; k++) {
    const kn = (k + 1) % perim.length;
    const p0 = perim[k];
    const p1 = perim[kn];
    const s0 = gridCount + k;
    const s1 = gridCount + kn;
    indices[w++] = p0;
    indices[w++] = p1;
    indices[w++] = s0;
    indices[w++] = p1;
    indices[w++] = s1;
    indices[w++] = s0;
  }

  const geom = new BufferGeometry();
  geom.setAttribute("position", new BufferAttribute(positions, 3));
  geom.setAttribute("normal", new BufferAttribute(normals, 3));
  geom.setAttribute("color", new BufferAttribute(colors, 3));
  geom.setIndex(new BufferAttribute(indices, 1));
  return geom;
}

// --- Geometry cache (module-level so camera motion only builds new tiles) -----

const geomCache = new Map<string, { geom: BufferGeometry; stamp: number }>();
let stamp = 0;
const CACHE_MAX = 420;

function getGeometry(tile: Tile): BufferGeometry {
  let entry = geomCache.get(tile.key);
  if (!entry) {
    entry = { geom: buildChunkGeometry(tile), stamp: 0 };
    geomCache.set(tile.key, entry);
  }
  entry.stamp = stamp;
  return entry.geom;
}

function evictStale(liveKeys: Set<string>) {
  if (geomCache.size <= CACHE_MAX) return;
  const entries = [...geomCache.entries()]
    .filter(([key]) => !liveKeys.has(key))
    .sort((a, b) => a[1].stamp - b[1].stamp);
  for (const [key, entry] of entries) {
    if (geomCache.size <= CACHE_MAX) break;
    entry.geom.dispose();
    geomCache.delete(key);
  }
}

// --- Component -----------------------------------------------------------------

export function Terrain() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const lastCam = useRef(new Vector2(Infinity, Infinity));

  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        vertexColors: true,
        roughness: 1,
        metalness: 0,
      }),
    []
  );

  useFrame(({ camera }) => {
    // Seasonal crossfade: one tint over Bright-neutral vertex colors.
    const d = dayness(useWorldClock.getState().phase);
    material.color.copy(mix(PALETTE.terrainTintDark, PALETTE.terrainTintBright, d));

    // Refresh the tile set when the camera has moved far enough to matter.
    const { x, z } = { x: camera.position.x, z: camera.position.z };
    if (Math.hypot(x - lastCam.current.x, z - lastCam.current.y) > TERRAIN.rebuildDistance) {
      lastCam.current.set(x, z);
      stamp++;
      const next = tilesForCamera(x, z);
      setTiles(next);
      evictStale(new Set(next.map((t) => t.key)));
    }
  });

  return (
    <group>
      {tiles.map((tile) => (
        <mesh key={tile.key} geometry={getGeometry(tile)} material={material} receiveShadow />
      ))}
    </group>
  );
}
