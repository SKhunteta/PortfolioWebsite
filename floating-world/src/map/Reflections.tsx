// Watercolor reflections on the water. Trains crossing the lake, ferries mid-
// Sound, and the city's shoreline lights (the Needle's ember, the stadium
// bowls) each shed a soft, broken, wobbling smear of their own colour onto the
// blue — a NIGHT creature that barely reads against the sun and is gone by
// noon, so it MULTIPLIES by the fog factor like every additive layer and stays
// well under the 1.0 bloom line (peak ~0.45). The still Prussian sheet is the
// strongest "alive" cue in the print; a shimmer of coloured light on it is what
// makes the water read wet instead of flat.
//
// The break-up rides the SAME world-space shoreline-breath noise the water
// itself wobbles on (Water.tsx's `wobble` — uWobbleFreq, the ~20 s drift), so
// every reflection ripples in lock-step with the wave-fans beneath it rather
// than to a clock of its own. Cheap: ONE additive InstancedMesh, flat on the
// water, gated so a reflection can only ever fall where there is water to
// receive it (map/waterHit.ts) — never a spill of light on the paper.
//
// Slots are laid out ferries · city lights · trains; matrices + per-instance
// colour and strength are written imperatively in useFrame, the hot path never
// touching React. renderOrder 4.65 sits just over the water edge stroke and
// under the foam wake and the hulls, depthWrite false.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CLOCK } from "../world/clock";
import { LIVE, lineGlow } from "../world/palettes";
import { sunPhase } from "../world/sun";
import { CONFIG } from "../world/config";
import { TRAINS, MAX_TRAINS_REFLECTED } from "../trains/store";
import { pointAt, LINE_BY_ID, projectLatLng } from "./network";
import { FERRY_VESSELS, ferryPoseAt, VesselPose } from "./Ferries";
import { LIGHTS, CITY_LIGHT_GLOW } from "./CityLights";
import { isOverWater, nearestWaterAnchor } from "./waterHit";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

// Flat unit quad in the XZ plane (y = 0), centred: local x,z run −0.5..0.5 and
// carry to the fragment as the smear's own coords, elongated by the matrix.
function flatQuad(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const xs = [-0.5, 0.5];
  const zs = [-0.5, 0.5];
  const quad = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 0],
    [1, 1],
    [0, 1],
  ];
  const pos: number[] = [];
  for (const [xi, zi] of quad) pos.push(xs[xi], 0, zs[zi]);
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  varying vec2 vLocal;
  void main() {
    vLocal = vec2(position.x, position.z);
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
  varying vec2 vLocal;
  uniform float uTime;
  uniform float uBreath;
  uniform float uWobbleFreq;
  void main() {
    if (vStr < 0.01) discard;
    // Soft body, elongated along local z so the colour "hangs" into the water
    // (vLocal.y carries the quad's local z).
    vec2 q = vLocal * 2.0;
    float body = exp(-(q.x * q.x) * 2.3 - (q.y * q.y) * 1.05);
    if (body < 0.004) discard;
    // The SAME shoreline-breath the water rides (Water.tsx wobble): a slow
    // world-space drift that shifts where the reflection breaks.
    float nx = wcNoise(vWorld * uWobbleFreq + uTime * 0.05);
    float nz = wcNoise(vWorld.yx * uWobbleFreq - uTime * 0.04);
    // Broken ripples running across the smear, their placement pushed by that
    // breath so the whole reflection wobbles in step with the wave-fans below.
    float rip = wcNoise(vWorld * (uWobbleFreq * 12.0) + vec2(nz * 2.0, uTime * 0.3 + nx * 2.0));
    float broken = 0.24 + 0.76 * smoothstep(0.26, 0.72, rip);
    // Additive light MULTIPLIES by the fog factor (never mixes toward it); it
    // swells a hair on the global breath and stays a wash, not a lantern.
    float glow = body * broken * vStr * (1.0 - fogFactor()) * (0.85 + 0.15 * uBreath);
    gl_FragColor = vec4(vColor * glow, glow);
  }
`;

// Instanced-attribute plumbing shared by both shader stages (declared once,
// prepended to each so vColor/vStr flow vertex → fragment).
const ATTRS_VERT = /* glsl */ `
  attribute vec3 aColor;
  attribute float aStr;
  varying vec3 vColor;
  varying float vStr;
`;
const ATTRS_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vStr;
`;

const FERRY_COUNT = FERRY_VESSELS.length;
const CITY_COUNT = LIGHTS.length;
const TRAIN_BASE = FERRY_COUNT + CITY_COUNT;
const TOTAL = TRAIN_BASE + MAX_TRAINS_REFLECTED;

const REFLECT_Y = CONFIG.basemap.waterY + 0.04; // just proud of the over-print, under the hulls

// City-light anchors: the point on the nearest water each land-bound light
// pours onto. Static — the Needle and the bowls never move — so computed once.
const CITY_ANCHORS = LIGHTS.map((l) => {
  const { x, z } = projectLatLng(l.lat, l.lng);
  return nearestWaterAnchor(x, z, 1.4);
});
// A lit bowl throws a broad pool; the Needle's ember a smaller one.
const CITY_SIZE = LIGHTS.map((l) =>
  l.venue ? { len: 1.2, wid: 0.9 } : { len: 0.7, wid: 0.5 }
);

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const scale = new THREE.Vector3();
const IDENT = new THREE.Quaternion();
const fPose: VesselPose = { x: 0, z: 0, yaw: 0, speed: 0 };
const scratch = { x: 0, z: 0 };

// Water-membership is only sampled a few times a second (trains crawl; the
// shoreline never jumps), then eased so entering or leaving the lake fades the
// reflection in and out instead of popping it. Keyed by train id — stable
// across frames where the instance slot is not.
const WATER_POLL_S = 0.16;
const waterTarget = new Map<string, number>(); // 0/1, refreshed on the poll
const waterEase = new Map<string, number>(); // smoothed strength, every frame

export function Reflections() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const lastPoll = useRef(-Infinity);

  const { geometry, colorAttr, strAttr } = useMemo(() => {
    const geometry = flatQuad();
    const colorAttr = new THREE.InstancedBufferAttribute(new Float32Array(TOTAL * 3), 3);
    colorAttr.setUsage(THREE.DynamicDrawUsage);
    const strAttr = new THREE.InstancedBufferAttribute(new Float32Array(TOTAL), 1);
    strAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aColor", colorAttr);
    geometry.setAttribute("aStr", strAttr);
    // City-light colours are fixed (day/night lives in their glow); set once.
    LIGHTS.forEach((l, i) => {
      const idx = FERRY_COUNT + i;
      colorAttr.setXYZ(idx, l.color.r, l.color.g, l.color.b);
    });
    return { geometry, colorAttr, strAttr };
  }, []);

  useFrame(() => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    // Reflections are a dusk-and-after phenomenon: painted light on water reads
    // only once the sun is off it. Keeps every strength under the bloom line.
    const night = 1 - sunPhase() * 0.92;
    const poll = CLOCK.t - lastPoll.current > WATER_POLL_S;
    if (poll) lastPoll.current = CLOCK.t;

    // Ferries — a lit cabin pours warm gold onto the Sound, moving or docked.
    const ferryStr = Math.min(0.45, night * (0.12 + LIVE.windowIntensity * 0.5));
    for (let i = 0; i < FERRY_COUNT; i++) {
      const v = FERRY_VESSELS[i];
      ferryPoseAt(v, CLOCK.t, fPose);
      const len = v.toyLengthKm * 2.6;
      const wid = v.toyLengthKm * 1.7;
      matrix.compose(position.set(fPose.x, REFLECT_Y, fPose.z), IDENT, scale.set(wid, 1, len));
      mesh.setMatrixAt(i, matrix);
      colorAttr.setXYZ(i, LIVE.trainWindow.r, LIVE.trainWindow.g, LIVE.trainWindow.b);
      strAttr.setX(i, ferryStr);
    }

    // City lights — each pools onto the nearest shore water at its own live
    // glow (already night-faded in CityLights). Lights with no water within
    // reach simply don't reflect.
    for (let i = 0; i < CITY_COUNT; i++) {
      const idx = FERRY_COUNT + i;
      const anchor = CITY_ANCHORS[i];
      if (!anchor) {
        strAttr.setX(idx, 0);
        continue;
      }
      const size = CITY_SIZE[i];
      matrix.compose(
        position.set(anchor.x, REFLECT_Y, anchor.z),
        IDENT,
        scale.set(size.wid, 1, size.len)
      );
      mesh.setMatrixAt(idx, matrix);
      // The beacon runs HDR-hot for its own ember; a reflection is a wash, so
      // rein it in. The bowls' spill is already gentle.
      const g = CITY_LIGHT_GLOW[i];
      const str = Math.min(0.45, LIGHTS[i].venue ? g * 0.95 : g * 0.26);
      strAttr.setX(idx, str);
    }

    // Trains — line-pigment shimmer, but only where a train is actually over
    // water (the 2 Line's lake crossing, shorelines), eased in and out.
    let t = 0;
    for (const train of TRAINS.values()) {
      if (t >= MAX_TRAINS_REFLECTED) break;
      pointAt(train.dir, train.sRendered, scratch);
      if (poll) waterTarget.set(train.id, isOverWater(scratch.x, scratch.z) ? 1 : 0);
      const target = waterTarget.get(train.id) ?? 0;
      const cur = waterEase.get(train.id) ?? 0;
      // Ease toward the polled target so crossing the shoreline fades the
      // reflection in and out (~0.4 s) rather than popping it.
      const eased = cur + (target - cur) * Math.min(1, CLOCK.dt * 3);
      waterEase.set(train.id, eased);

      const idx = TRAIN_BASE + t;
      const len = train.modelL * 2.4 + 0.15;
      const wid = train.modelL * 1.4 + 0.1;
      matrix.compose(position.set(scratch.x, REFLECT_Y, scratch.z), IDENT, scale.set(wid, 1, len));
      mesh.setMatrixAt(idx, matrix);
      const glow = lineGlow(train.lineId, LINE_BY_ID.get(train.lineId)?.color ?? "#5fe3b0");
      colorAttr.setXYZ(idx, glow.r, glow.g, glow.b);
      strAttr.setX(idx, Math.min(0.4, eased * night * 0.34));
      t++;
    }

    mesh.count = TRAIN_BASE + t;
    mesh.instanceMatrix.needsUpdate = true;
    colorAttr.needsUpdate = true;
    strAttr.needsUpdate = true;

    mat.uniforms.uTime.value = CLOCK.t;
    mat.uniforms.uBreath.value = CLOCK.breath;
    mat.uniforms.uFogDensity.value = LIVE.fogDensity;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, TOTAL]}
      geometry={geometry}
      renderOrder={4.65}
      frustumCulled={false}
    >
      <shaderMaterial
        ref={matRef}
        vertexShader={ATTRS_VERT + VERT}
        fragmentShader={ATTRS_FRAG + FRAG}
        uniforms={{
          uTime: { value: 0 },
          uBreath: { value: 0 },
          uWobbleFreq: { value: CONFIG.basemap.wobbleFreq },
          uFog: { value: LIVE.fog },
          uFogDensity: { value: LIVE.fogDensity },
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}
