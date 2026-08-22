// The Fremont Bridge, promoted from a static inked deck in the Landmarks
// merge to the print's working bascule: the most-opened drawbridge in America
// (~35 times a day, for real), painted in its famous blue-and-orange and
// opening on the deterministic wall-clock schedule in world/fremont.ts — the
// leaves rise, a little sailboat mast glides the cut, the leaves settle. The
// rush-hour restriction is the real one (weekdays 7–9 and 4–6 the span stays
// down), so the bridge's day has the true shape even at storybook cadence.
//
// THREE draw calls, gated-critter discipline:
//   1. the static half — approach decks, the two pivot piers dropping to the
//      water, and the four little orange control towers — ONE merged geometry;
//   2. the two bascule leaves — ONE InstancedMesh, matrices written
//      imperatively in useFrame (pivot at each leaf's shore edge, with the
//      counterweight block swinging down below the deck as the leaf rises);
//   3. the sailboat that asked — sumi hull and mast under a washi sail,
//      hidden entirely (visible = false, zero cost) except around an opening.
// The displayed leaf angle EASES toward the schedule's target so a tab
// resume or the rush-hour cutoff never snaps the span.
//
// Paint: per-vertex aPaint picks the pigment — the real bridge blue, the
// orange trim it is famous for, warm pier concrete, sumi boat ink, washi
// sail — all fixed identity pigments under the bloom ceiling, washed and
// fog-mixed like every landmark. depthWrite TRUE with the landmarks (the
// same multi-part-solid exception: an open leaf must occlude its own
// counterweight and the boat behind it). renderOrder 6 beside the merge it
// came from. ?bridge=on|off pins it; __linkMap.bridge() from the console.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { projectLatLng } from "./network";
import { CONFIG } from "../world/config";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { bridgeState } from "../world/fremont";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

// South bank to north bank across the Fremont Cut. The Landmarks merge used
// to ink this span a touch long (north end at 47.65); the real deck ends by
// ~47.649, and pulling it in seats the movable leaves over the channel
// centerline instead of the north bank.
const SOUTH: [number, number] = [47.6468, -122.3497];
const NORTH: [number, number] = [47.649, -122.3496];
const DECK_W = 0.04;
const DECK_RISE = 0.08; // deck height above the water — the LOW bridge (why it opens so often)
const WATER_Y = CONFIG.basemap.waterY;
const DECK_T = 0.02;

// Each leaf spans a fifth of the crossing; the approaches carry the rest.
const LEAF_FRAC = 0.2;
// Fully raised is ~66° — the real bascule's proud angle.
const OPEN_ANGLE = 1.15;

// How far the sailboat's crossing runs to either side of the span.
const BOAT_RUN_KM = 0.4;

// aPaint values.
const P_STEEL = 0;
const P_TRIM = 1;
const P_PIER = 2;
const P_INK = 3;
const P_SAIL = 4;

const STATIC_VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aPaint;
  varying float vPaint;
  varying float vY;
  void main() {
    vPaint = aPaint;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vY = world.y;
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const LEAF_VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aPaint;
  varying float vPaint;
  varying float vY;
  void main() {
    vPaint = aPaint;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vY = world.y;
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying float vPaint;
  varying float vY;
  uniform vec3 uSteel;   // the famous Fremont blue
  uniform vec3 uTrim;    // its orange railings and towers
  uniform vec3 uPier;    // warm concrete
  uniform vec3 uInk;     // sumi hull and mast
  uniform vec3 uSail;    // washi canvas
  uniform float uOpacity;
  void main() {
    float wash = wcFbm(vWorld * 3.0 + vY * 5.0);
    vec3 c = uSteel;
    c = mix(c, uTrim, step(0.5, vPaint));
    c = mix(c, uPier, step(1.5, vPaint));
    c = mix(c, uInk, step(2.5, vPaint));
    c = mix(c, uSail, step(3.5, vPaint));
    c *= 0.84 + 0.3 * wash;
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), uOpacity * 0.95);
  }
`;

/** Merge parts and stamp each with a single aPaint value. */
function mergePainted(parts: { geo: THREE.BufferGeometry; paint: number }[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts.map((p) => p.geo), false)!;
  const paint = new Float32Array(merged.attributes.position.count);
  let offset = 0;
  for (const p of parts) {
    const n = p.geo.attributes.position.count;
    paint.fill(p.paint, offset, offset + n);
    offset += n;
    p.geo.dispose();
  }
  merged.setAttribute("aPaint", new THREE.BufferAttribute(paint, 1));
  return merged;
}

interface Frame {
  a: { x: number; z: number }; // south abutment
  u: { x: number; z: number }; // unit axis, south → north
  perp: { x: number; z: number }; // unit across-canal (the boats' road)
  len: number;
  yaw: number; // +x → axis heading, monorail convention
  deckY: number;
  approachLen: number;
  leafLen: number;
}

function buildFrame(): Frame {
  const a = projectLatLng(SOUTH[0], SOUTH[1]);
  const b = projectLatLng(NORTH[0], NORTH[1]);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  const u = { x: dx / len, z: dz / len };
  return {
    a,
    u,
    perp: { x: -u.z, z: u.x },
    len,
    yaw: Math.atan2(-dz, dx),
    deckY: WATER_Y + DECK_RISE,
    approachLen: (len * (1 - 2 * LEAF_FRAC)) / 2,
    leafLen: len * LEAF_FRAC,
  };
}

/** The static half: approaches, pivot piers, control towers — built along +x
 *  in axis space, then rotated/translated onto the crossing like bridge()
 *  used to do in Landmarks.tsx. */
function buildStatic(f: Frame): THREE.BufferGeometry {
  const parts: { geo: THREE.BufferGeometry; paint: number }[] = [];
  const deck = (x0: number, x1: number) => {
    const g = new THREE.BoxGeometry(x1 - x0, DECK_T, DECK_W);
    g.translate((x0 + x1) / 2, f.deckY, 0);
    parts.push({ geo: g, paint: P_STEEL });
  };
  deck(0, f.approachLen);
  deck(f.len - f.approachLen, f.len);
  for (const px of [f.approachLen, f.len - f.approachLen]) {
    const h = f.deckY - WATER_Y;
    const pier = new THREE.BoxGeometry(DECK_W * 0.6, h, DECK_W * 0.7);
    pier.translate(px, WATER_Y + h / 2, 0);
    parts.push({ geo: pier, paint: P_PIER });
    // The little orange control towers flanking each pivot — the four
    // huts every Fremonter knows.
    for (const side of [-1, 1]) {
      const tower = new THREE.BoxGeometry(0.016, 0.045, 0.016);
      tower.translate(px, f.deckY + 0.0225, side * (DECK_W / 2 + 0.014));
      parts.push({ geo: tower, paint: P_TRIM });
    }
  }
  const merged = mergePainted(parts);
  merged.rotateY(-f.yaw);
  merged.translate(f.a.x, 0, f.a.z);
  return merged;
}

/** One bascule leaf, unit length along +x with its pivot at the origin: the
 *  deck plate reaching x 0→1 (instance-scaled to leafLen) and the
 *  counterweight block hung behind/below the pivot, swinging down as the
 *  leaf swings up — exactly how a bascule balances. */
function buildLeaf(): THREE.BufferGeometry {
  const deck = new THREE.BoxGeometry(1, DECK_T, DECK_W);
  deck.translate(0.5, 0, 0);
  const weight = new THREE.BoxGeometry(0.2, 0.055, DECK_W * 0.8);
  weight.translate(-0.1, -0.04, 0);
  return mergePainted([
    { geo: deck, paint: P_STEEL },
    { geo: weight, paint: P_STEEL },
  ]);
}

/** The sailboat: sumi hull and mast, one washi mainsail. Built along +x. */
function buildBoat(): THREE.BufferGeometry {
  const hull = new THREE.BoxGeometry(0.055, 0.014, 0.02);
  hull.translate(0, 0.007, 0);
  const mast = new THREE.BoxGeometry(0.004, 0.15, 0.004);
  mast.translate(0.005, 0.089, 0);
  const shape = new THREE.Shape();
  shape.moveTo(0.008, 0.03);
  shape.lineTo(0.008, 0.145);
  shape.lineTo(0.05, 0.038);
  shape.closePath();
  const sail = new THREE.ShapeGeometry(shape);
  return mergePainted([
    { geo: hull, paint: P_INK },
    { geo: mast, paint: P_INK },
    { geo: sail, paint: P_SAIL },
  ]);
}

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const nod = new THREE.Quaternion();
const scale = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const PITCH_AXIS = new THREE.Vector3(0, 0, 1);

// Fixed identity pigments — the bridge's real coat, saturated a shade to
// survive the pale washes, held under the bloom ceiling.
const STEEL = new THREE.Color("#4a6d94"); // Fremont blue
const TRIM = new THREE.Color("#c2601f"); // Fremont orange
const PIER = new THREE.Color("#9b8f76"); // the monorail pylons' aged concrete
const INK = new THREE.Color("#3c2e21"); // sumi hull, kin to the canoe

function uniforms() {
  return {
    uSteel: { value: STEEL },
    uTrim: { value: TRIM },
    uPier: { value: PIER },
    uInk: { value: INK },
    uSail: { value: LIVE.ferry }, // palette-by-reference: washi by day, lantern-warm at night
    uOpacity: { value: LIVE.landmarkOpacity },
    uFog: { value: LIVE.fog },
    uFogDensity: { value: LIVE.fogDensity },
  };
}

// The bridge's world anchor, for the smoke harness / a curious console.
export function fremontAnchor() {
  const f = buildFrame();
  return { x: f.a.x + (f.u.x * f.len) / 2, z: f.a.z + (f.u.z * f.len) / 2 };
}

export function FremontBridge() {
  const leavesRef = useRef<THREE.InstancedMesh>(null);
  const boatRef = useRef<THREE.Mesh>(null);
  const staticMatRef = useRef<THREE.ShaderMaterial>(null);
  const leafMatRef = useRef<THREE.ShaderMaterial>(null);
  const boatMatRef = useRef<THREE.ShaderMaterial>(null);
  const shownAngle = useRef(0);

  const frame = useMemo(buildFrame, []);
  const staticGeometry = useMemo(() => buildStatic(frame), [frame]);
  const leafGeometry = useMemo(buildLeaf, []);
  const boatGeometry = useMemo(buildBoat, []);

  useFrame(() => {
    const leaves = leavesRef.current;
    if (!leaves) return;
    for (const m of [staticMatRef.current, leafMatRef.current, boatMatRef.current]) {
      if (!m) continue;
      m.uniforms.uOpacity.value = LIVE.landmarkOpacity;
      m.uniforms.uFogDensity.value = LIVE.fogDensity;
    }

    const state = bridgeState();
    // Ease the displayed angle toward the schedule so a tab resume or the
    // rush-hour cutoff never snaps the span shut mid-air.
    shownAngle.current +=
      (state.open01 * OPEN_ANGLE - shownAngle.current) * Math.min(1, CLOCK.dt * 2.5);
    const angle = shownAngle.current;

    const { a, u, len, yaw, deckY, approachLen, leafLen } = frame;
    // South leaf points north (+u) from its pivot; the north leaf answers.
    for (let i = 0; i < 2; i++) {
      const south = i === 0;
      const px = south ? approachLen : len - approachLen;
      quaternion.setFromAxisAngle(UP, south ? yaw : yaw + Math.PI);
      nod.setFromAxisAngle(PITCH_AXIS, angle);
      quaternion.multiply(nod);
      matrix.compose(
        position.set(a.x + u.x * px, deckY, a.z + u.z * px),
        quaternion,
        scale.set(leafLen, 1, 1)
      );
      leaves.setMatrixAt(i, matrix);
    }
    leaves.instanceMatrix.needsUpdate = true;

    const boat = boatRef.current;
    if (boat) {
      if (state.boat) {
        boat.visible = true;
        const { t01, dir } = state.boat;
        const along = BOAT_RUN_KM * (2 * t01 - 1) * dir;
        const mx = a.x + (u.x * len) / 2 + frame.perp.x * along;
        const mz = a.z + (u.z * len) / 2 + frame.perp.z * along;
        boat.position.set(mx, WATER_Y, mz);
        boat.rotation.y = Math.atan2(-frame.perp.z * dir, frame.perp.x * dir);
      } else {
        boat.visible = false; // zero cost while the canal is quiet
      }
    }
  });

  return (
    <>
      <mesh geometry={staticGeometry} renderOrder={6} frustumCulled={false}>
        <shaderMaterial
          ref={staticMatRef}
          vertexShader={STATIC_VERT}
          fragmentShader={FRAG}
          uniforms={uniforms()}
          transparent
          depthWrite // multi-part solid with the landmarks — see file header
          side={THREE.DoubleSide}
        />
      </mesh>
      <instancedMesh
        ref={leavesRef}
        args={[undefined, undefined, 2]}
        geometry={leafGeometry}
        renderOrder={6}
        frustumCulled={false}
      >
        <shaderMaterial
          ref={leafMatRef}
          vertexShader={LEAF_VERT}
          fragmentShader={FRAG}
          uniforms={uniforms()}
          transparent
          depthWrite
          side={THREE.DoubleSide}
        />
      </instancedMesh>
      <mesh ref={boatRef} geometry={boatGeometry} renderOrder={6} frustumCulled={false} visible={false}>
        <shaderMaterial
          ref={boatMatRef}
          vertexShader={STATIC_VERT}
          fragmentShader={FRAG}
          uniforms={uniforms()}
          transparent
          depthWrite
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}
