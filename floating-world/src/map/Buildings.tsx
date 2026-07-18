// The woodblock town: the field of tiny hipped-roof houses and low blocks
// that lines every street in the print, thickening into massed towers where
// downtown takes over. ONE InstancedMesh of a merged house unit (box body +
// pyramid roof), one draw call; each instance is placed on a road frontage
// (map/scatter.ts) turned to face the street, scaled low in the neighborhoods
// and tall toward the core. Painted like the named landmarks — a fixed key
// light from the northwest shades each face so the massing reads solid, over
// a watercolor wash, mixed toward the scene fog at the horizon.
//
// The hero silhouettes (Needle, stadiums, Rainier) stay in Landmarks.tsx and
// paint just over this fabric; this is the quiet city around them.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LIVE } from "../world/palettes";
import { CLOCK } from "../world/clock";
import { useUi } from "../trains/store";
import { undergroundSiteById } from "../stations/platformPulse";
import { PROFILE } from "../world/device";
import { CONFIG } from "../world/config";
import { mulberry32, fbm, isWater, sampleRoadFrontages } from "./scatter";
import { projectLatLng } from "./network";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

// Hero landmarks the scattered town must NOT bury. SODO around the two
// stadiums is stadium footprint and parking, not a fabric of hipped-roof
// houses — but the road frontages run right past both bowls, so without a
// keep-out the generic blocks land on top of Lumen Field and T-Mobile Park and
// crowd their arches into an unreadable clump (Landmarks.tsx paints the bowls;
// this layer must clear the ground for them). Keep-out discs in projected km,
// sized to cover each bowl plus its roof span with a little margin.
const KEEP_OUT: { x: number; z: number; r2: number }[] = [
  { ...projectLatLng(47.5952, -122.3316), r: 0.4 }, // Lumen Field
  { ...projectLatLng(47.5914, -122.3325), r: 0.4 }, // T-Mobile Park
].map(({ x, z, r }) => ({ x, z, r2: r * r }));

function inKeepOut(x: number, z: number): boolean {
  for (const k of KEEP_OUT) {
    const dx = x - k.x;
    const dz = z - k.z;
    if (dx * dx + dz * dz < k.r2) return true;
  }
  return false;
}

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aTone;
  varying vec3 vNormal;
  varying float vY;
  varying float vTone;
  void main() {
    vTone = aTone;
    vec4 world = instanceMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vY = world.y;
    vNormal = normalize((instanceMatrix * vec4(normal, 0.0)).xyz);
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform vec3 uDive; // xy = dived hall's world XZ, z = fade strength 0..1
  varying vec3 vNormal;
  varying float vY;
  varying float vTone;
  void main() {
    float wash = wcFbm(vWorld * 0.9 + vTone * 9.0);
    // Fixed key light from the northwest sky — lit and shadowed faces diverge
    // so the little blocks read with dimension. The ambient floor sits HIGH:
    // these buildings are 1–3 px at drift distance, so a shadowed side must
    // still read as pale sepia, never average down to a black speck.
    vec3 n = normalize(vNormal);
    float key = 0.78 + 0.26 * max(0.0, dot(n, normalize(vec3(-0.5, 0.8, -0.45))));
    vec3 c = uColor * vTone * key * (0.92 + 0.18 * wash);
    // Roofs (up-facing, higher) catch a touch more light than the walls.
    c *= 0.96 + 0.12 * smoothstep(0.0, 0.5, vY);
    // The dive skylight: while the camera holds inside an underground hall,
    // the town within the hall's footprint thins to a ghost so the room
    // reads through the paper instead of hiding behind downtown's towers.
    float skylight = uDive.z * (1.0 - smoothstep(0.55, 1.3, distance(vWorld, uDive.xy)));
    gl_FragColor = vec4(
      mix(c, uFog, fogFactor()),
      uOpacity * (0.95 + 0.08 * wash) * (1.0 - 0.82 * skylight)
    );
  }
`;

const HEART = { x: CONFIG.camera.heartX, z: CONFIG.camera.heartZ };

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** A unit house centered on the XZ origin, base on the paper (y 0), total
 *  height ~1: a box body under a low pyramid roof. Scaled per instance. */
function unitHouse(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(1, 0.7, 1);
  body.translate(0, 0.35, 0);
  const roof = new THREE.ConeGeometry(0.71, 0.32, 4);
  roof.rotateY(Math.PI / 4); // square the pyramid onto the body footprint
  roof.translate(0, 0.86, 0);
  const geo = mergeGeometries([body, roof], false)!;
  body.dispose();
  roof.dispose();
  return geo;
}

export function Buildings() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(unitHouse, []);

  const { count, matrices } = useMemo(() => {
    const rand = mulberry32(0xb17d);
    const target = PROFILE.buildingCount;
    // Frontages on both sides of every road; shuffle so the town spreads
    // across the whole network instead of filling the first streets.
    const pts = sampleRoadFrontages(0.11, 0.02);
    for (let i = pts.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = pts[i];
      pts[i] = pts[j];
      pts[j] = t;
    }
    const mats: THREE.Matrix4[] = [];
    const tones: number[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    for (const p of pts) {
      if (mats.length >= target) break;
      if (isWater(p.x, p.z)) continue;
      if (inKeepOut(p.x, p.z)) continue; // don't bury the SODO stadiums
      const dHeart = Math.hypot(p.x - HEART.x, p.z - HEART.z);
      const downtown = smoothstep(7.5, 0.5, dHeart);
      // The town gathers into settlements — a noise field gates where the
      // fabric appears, so the countryside between towns stays forest instead
      // of every rural road wearing a dotted line of houses.
      const townField = fbm(p.x * 0.11 + 3.1, p.z * 0.11 + 8.2);
      const townGate = smoothstep(0.5, 0.86, townField);
      const keepProb = Math.min(1, downtown + townGate * 0.85);
      if (rand() > keepProb) continue;
      // Face the street, with a jitter on the yaw so the rows don't read as a
      // ruled line.
      const yaw = Math.atan2(p.nx, p.nz) + (rand() - 0.5) * 0.6;
      const w = 0.045 + rand() * 0.075;
      const d = 0.045 + rand() * 0.075;
      let h = 0.04 + rand() * 0.07 + downtown * (0.07 + rand() * 0.36);
      if (rand() < 0.02) h *= 1.9; // the odd tower breaking the roofline
      // The frontage point (p) already sits just outside the road stroke.
      // Set the house back by its own footprint so its street-facing wall — not
      // its center — lands on the frontage line, and jitter ONLY along the
      // street (jt) or further from it (jn, one-sided): a house must never
      // wander back onto the road it fronts.
      const footHalf = Math.max(w, d) / 2;
      const setout = footHalf + rand() * 0.03;
      const tx = p.nz; // road tangent (perpendicular to the outward normal)
      const tz = -p.nx;
      const jt = (rand() - 0.5) * 0.08;
      pos.set(p.x + p.nx * setout + tx * jt, 0.001, p.z + p.nz * setout + tz * jt);
      q.setFromAxisAngle(up, yaw);
      scl.set(w, h, d);
      m.compose(pos, q, scl);
      mats.push(m.clone());
      tones.push(0.82 + rand() * 0.4);
    }
    // Per-instance tone rides on the shared geometry as an instanced attribute
    // (the instancedMesh takes geometry via args, so there's no JSX child to
    // attach it through — set it on the geometry directly).
    geometry.setAttribute("aTone", new THREE.InstancedBufferAttribute(new Float32Array(tones), 1));
    return { count: mats.length, matrices: mats };
  }, [geometry]);

  const placed = useRef(false);
  useFrame(() => {
    const mesh = meshRef.current;
    const mat = materialRef.current;
    if (!mesh) return;
    if (!placed.current) {
      placed.current = true;
      for (let i = 0; i < count; i++) mesh.setMatrixAt(i, matrices[i]);
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (mat) {
      mat.uniforms.uOpacity.value = LIVE.buildingOpacity;
      mat.uniforms.uFogDensity.value = LIVE.fogDensity;
      // Ease the skylight open over the dived hall (and closed on release) —
      // the fade breathes with the camera's own glide, never a hard pop.
      const diveId = useUi.getState().diveStationId;
      const site = diveId ? undergroundSiteById(diveId) : undefined;
      const dive = mat.uniforms.uDive.value as THREE.Vector3;
      if (site) {
        dive.x = site.x;
        dive.y = site.z;
        dive.z = Math.min(1, dive.z + CLOCK.dt * 1.6);
      } else {
        dive.z = Math.max(0, dive.z - CLOCK.dt * 1.6);
      }
    }
  });

  if (!count) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, count]}
      renderOrder={6.2}
      frustumCulled={false}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uColor: { value: LIVE.building }, // palette-by-reference
          uOpacity: { value: LIVE.buildingOpacity },
          uDive: { value: new THREE.Vector3(0, 0, 0) },
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
