// The Burke-Gilman cyclists AND the Green Lake loop riders: a few toy riders
// gliding Seattle's famous rail-trail — which threads right past the U-District
// and Husky Stadium stops — plus a ring of riders circling Green Lake on its
// beloved lakeside path. So the bikes cross the rail world instead of
// decorating a corner of it. The opposite of the anonymous freeway wash
// (map/TrafficWash.tsx): these are HERO figures you can pick out and follow,
// exactly like the ferries. Background paint, not data — like Rainier and the
// ferries they belong to the page: real routes, a real riding pace,
// deterministic from the scene clock, never presented as live. Their
// count-of-visible thins with the real Seattle hour (world/traffic.ts): a
// couple at dawn, fuller on a bright midday, near-empty after dark. The
// Burke-Gilman is a linear trail (a bike turns around at each end); Green Lake
// is a closed loop (a rider just keeps going around).
//
// ONE InstancedMesh (one draw call, matching the instanced-everything rule),
// matrices written imperatively in useFrame — the hot path never touches
// React. Painted in the label ink (LIVE.label): sumi-brown on the bright washi
// by day, warm cream by lantern light — the contrast-flipping color that keeps
// a lone rider legible on paper the way the ink outline keeps the trains
// legible. Normal-blended and mixed toward LIVE.fog so a distant rider
// dissolves into the kasumi; renderOrder 6 beside the ferries, depthWrite
// false, painted by MIX so it never crosses the bloom line.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { projectLatLng } from "./network";
import { BASEMAP_WATER, HAS_BASEMAP } from "./basemap";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { PROFILE } from "../world/device";
import { CONFIG } from "../world/config";
import { trafficIntensity } from "../world/traffic";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying vec3 vLocal;
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    float wash = wcFbm(vWorld * 2.2 + vLocal.y * 4.0);
    // The rider sits warmer/darker than the frame below — a little tonal life.
    vec3 c = uColor * (0.72 + 0.4 * wash) * mix(1.05, 0.85, smoothstep(0.0, 0.7, vLocal.y));
    float a = uOpacity * (0.9 + 0.2 * wash);
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), a);
  }
`;

interface Route {
  pts: { x: number; z: number }[];
  cum: number[];
  lengthKm: number;
  loop: boolean; // closed ring (Green Lake) vs. out-and-back trail (Burke-Gilman)
}

function routeFromXZ(base: { x: number; z: number }[], loop = false): Route {
  // A loop closes back onto its first point, so append it as a real vertex —
  // then the closing segment is just another leg the sampler walks.
  const pts = loop ? [...base, base[0]] : base;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  }
  return { pts, cum, lengthKm: cum[cum.length - 1], loop };
}

function route(latlngs: [number, number][], loop = false): Route {
  return routeFromXZ(
    latlngs.map(([lat, lng]) => projectLatLng(lat, lng)),
    loop
  );
}

// The Burke-Gilman's core arc across the visible map: Ballard → Fremont → Gas
// Works / north Lake Union → the U-District and UW stations → up Lake
// Washington's west shore. Coarse real waypoints, bowed like the real trail.
const BURKE_GILMAN = route([
  [47.6698, -122.3860], // Ballard, near the locks
  [47.6580, -122.3620], // toward Fremont
  [47.6495, -122.3470], // Fremont
  [47.6460, -122.3340], // Gas Works, north Lake Union
  [47.6530, -122.3120], // U-District (near the station)
  [47.6505, -122.3010], // UW / Husky Stadium station
  [47.6640, -122.2880], // north up the Lake Washington shore
  [47.6790, -122.2770], // Matthews Beach
]);

// The Green Lake path: the ring AROUND the lake that everyone in Seattle knows,
// walked and ridden all day. Riders must stay on the surrounding park path, not
// out on the water — so we trace the lake's ACTUAL baked shoreline
// (basemap.json, water polygon) and push every vertex outward from its centroid
// so the ridden ring hugs the bank just beyond the wave pattern. `loop` closes
// it so a rider just keeps going around instead of turning back.
const GREEN_LAKE_CENTER = projectLatLng(47.6807, -122.334);
// How far the ridden ring sits OUTSIDE the shoreline, in km — a uniform buffer
// so riders travel the surrounding bank, never the water. ~0.11 clears the
// seigaiha wash and the toy bike's own width.
const GREEN_LAKE_MARGIN = 0.11;

/** The baked Green Lake polygon, pushed outward by a uniform margin into a
 *  rideable ring on the bank — or null if the basemap is the placeholder stub
 *  (no real water to hug). Offsetting along each vertex's outward normal keeps
 *  the whole ring off the water even where the real shoreline curves inward,
 *  which a simple centroid-scale can't. */
function greenLakeRing(): { x: number; z: number }[] | null {
  if (!HAS_BASEMAP || BASEMAP_WATER.length === 0) return null;
  let best: [number, number][] | null = null;
  let bestD = Infinity;
  for (const w of BASEMAP_WATER) {
    let sx = 0;
    let sz = 0;
    for (const [x, z] of w.ring) {
      sx += x;
      sz += z;
    }
    const cx = sx / w.ring.length;
    const cz = sz / w.ring.length;
    const d = Math.hypot(cx - GREEN_LAKE_CENTER.x, cz - GREEN_LAKE_CENTER.z);
    if (d < bestD) {
      bestD = d;
      best = w.ring;
    }
  }
  // Nothing lake-like near Green Lake (unexpected on the real basemap): bail to
  // the hand-authored fallback rather than ring some far-off pond.
  if (!best || bestD > 1.0) return null;
  // Baked rings often repeat the first point at the end; drop it so per-vertex
  // normals and the loop's closing segment don't double up.
  const ring =
    best.length > 1 &&
    Math.hypot(best[0][0] - best[best.length - 1][0], best[0][1] - best[best.length - 1][1]) < 1e-3
      ? best.slice(0, -1)
      : best;
  let sx = 0;
  let sz = 0;
  for (const [x, z] of ring) {
    sx += x;
    sz += z;
  }
  const cx = sx / ring.length;
  const cz = sz / ring.length;
  const n = ring.length;
  return ring.map((p, i) => {
    const prev = ring[(i - 1 + n) % n];
    const next = ring[(i + 1) % n];
    // Average of the two adjacent edge normals: the local outward direction.
    let nx = p[1] - prev[1] + (next[1] - p[1]);
    let nz = -(p[0] - prev[0]) - (next[0] - p[0]);
    const len = Math.hypot(nx, nz) || 1;
    nx /= len;
    nz /= len;
    // Point it away from the lake centre (the shoreline is star-shaped about it).
    if (nx * (p[0] - cx) + nz * (p[1] - cz) < 0) {
      nx = -nx;
      nz = -nz;
    }
    return { x: p[0] + nx * GREEN_LAKE_MARGIN, z: p[1] + nz * GREEN_LAKE_MARGIN };
  });
}

// Fallback loop (placeholder basemap only): a coarse ring authored from real
// Green Lake waypoints, already sized to clear the water.
const GREEN_LAKE_FALLBACK: [number, number][] = [
  [47.685, -122.334], // north shore
  [47.6836, -122.3285], // northeast
  [47.6805, -122.327], // east shore (East Green Lake Dr)
  [47.6772, -122.3285], // southeast
  [47.676, -122.334], // south shore (Aqua Theater end)
  [47.6772, -122.3395], // southwest
  [47.6805, -122.341], // west shore (West Green Lake Dr)
  [47.6836, -122.3395], // northwest
];

const GREEN_LAKE = (() => {
  const ring = greenLakeRing();
  return ring ? routeFromXZ(ring, true) : route(GREEN_LAKE_FALLBACK, true);
})();

// Deterministic 0..1 hash — no Math.random, so reloads lay the riders out the
// same way every time (the scene's determinism rule).
function hash(n: number): number {
  return Math.abs((Math.sin(n * 91.37 + 12.7) * 43758.5453) % 1);
}

export interface Rider {
  route: Route; // which path this rider travels
  phase: number; // fraction of the round trip already ridden at t = 0
  speedKmS: number; // real-ish riding pace
}

// Both rider sets share ONE instanced mesh (the one-draw-call rule): build a
// flat list, tagging each with its route. Phases spread each set evenly along
// its own path so no two riders stack, and a hashed speed jitter keeps the pack
// from moving in lockstep. The seed offset on the loop set keeps its jitter
// independent of the trail set's.
function fleet(route: Route, count: number, seed: number): Rider[] {
  return Array.from({ length: count }, (_, i) => ({
    route,
    phase: (i + 0.5) / count,
    speedKmS: CONFIG.cyclist.speedKmS * (0.85 + 0.3 * hash((i + seed) * 3.1)),
  }));
}

const RIDERS: Rider[] = [
  ...fleet(BURKE_GILMAN, PROFILE.cyclistCount, 0),
  ...fleet(GREEN_LAKE, PROFILE.greenLakeCyclistCount, 100),
];

export interface RiderPose {
  x: number;
  z: number;
  yaw: number;
}

const pose: RiderPose = { x: 0, z: 0, yaw: 0 };

/** Where a rider is at clock time t. On a loop the rider rides on forever around
 *  the ring; on a trail it ping-pongs (a bike simply turns around at each end).
 *  Heading is the forward tangent. */
function riderPoseAt(r: Rider, t: number, out: RiderPose = pose): RiderPose {
  const rt = r.route;
  let s: number;
  let forward: boolean;
  if (rt.loop) {
    // One lap = lengthKm; wrap the distance around and always ride forward.
    const lap = rt.lengthKm / r.speedKmS;
    const p = (t + r.phase * lap) % lap;
    s = p * r.speedKmS;
    forward = true;
  } else {
    const crossS = rt.lengthKm / r.speedKmS;
    const period = 2 * crossS;
    const p = (t + r.phase * period) % period;
    if (p < crossS) {
      s = p * r.speedKmS;
      forward = true;
    } else {
      s = rt.lengthKm - (p - crossS) * r.speedKmS;
      forward = false;
    }
  }
  const { pts, cum } = rt;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const f = THREE.MathUtils.clamp((s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]), 0, 1);
  const a = pts[i - 1];
  const b = pts[i];
  out.x = a.x + (b.x - a.x) * f;
  out.z = a.z + (b.z - a.z) * f;
  const dx = (b.x - a.x) * (forward ? 1 : -1);
  const dz = (b.z - a.z) * (forward ? 1 : -1);
  out.yaw = Math.atan2(-dz, dx);
  return out;
}

/** Unit-length bike along +X, wheels on the ground at y = 0: two side-on
 *  wheels, a frame bar, and a seated rider — a legible woodblock silhouette. */
function buildBike(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const end of [-1, 1]) {
    const wheel = new THREE.TorusGeometry(0.22, 0.035, 6, 14); // side-on: plane holds X (roll) and Y (up)
    wheel.translate(end * 0.35, 0.22, 0);
    parts.push(wheel);
  }
  const frame = new THREE.BoxGeometry(0.6, 0.05, 0.05);
  frame.rotateZ(0.12);
  frame.translate(0, 0.32, 0);
  parts.push(frame);
  const seatPost = new THREE.BoxGeometry(0.05, 0.16, 0.05);
  seatPost.translate(-0.05, 0.42, 0);
  parts.push(seatPost);
  const bars = new THREE.BoxGeometry(0.05, 0.14, 0.05);
  bars.translate(0.28, 0.4, 0);
  parts.push(bars);
  // The rider: a leaning body and a small head above the bars.
  const body = new THREE.BoxGeometry(0.26, 0.34, 0.14);
  body.rotateZ(0.42); // hunched forward over the bars
  body.translate(0.02, 0.62, 0);
  parts.push(body);
  const head = new THREE.BoxGeometry(0.12, 0.12, 0.12);
  head.translate(0.16, 0.82, 0);
  parts.push(head);
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  return merged;
}

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export function Cyclists() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(buildBike, []);

  useFrame(() => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;
    // Fewer riders read on the trail after dark; a floor keeps one or two
    // always present by day so the trail is never dead.
    m.uniforms.uOpacity.value = 0.92 * (0.25 + 0.75 * trafficIntensity());
    m.uniforms.uFogDensity.value = LIVE.fogDensity;
    for (let i = 0; i < RIDERS.length; i++) {
      const { x, z, yaw } = riderPoseAt(RIDERS[i], CLOCK.t);
      quaternion.setFromAxisAngle(UP, yaw);
      matrix.compose(
        position.set(x, CONFIG.cyclist.y, z),
        quaternion,
        scale.setScalar(CONFIG.cyclist.toyLenKm)
      );
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (RIDERS.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, RIDERS.length]}
      geometry={geometry}
      renderOrder={6}
      frustumCulled={false}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          // Ink on paper: sumi-brown by day, warm cream by lantern light — the
          // same contrast-flipping color the labels use, so a lone rider reads
          // as a hand-inked traveler on the bright washi (the trains' legibility
          // rule) instead of dissolving into the warm town.
          uColor: { value: LIVE.label },
          uOpacity: { value: 0.9 },
          uFog: { value: LIVE.fog },
          uFogDensity: { value: LIVE.fogDensity },
        }}
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
      />
    </instancedMesh>
  );
}
