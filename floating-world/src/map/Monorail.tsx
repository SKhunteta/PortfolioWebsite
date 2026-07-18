// The 1962 Seattle Center Monorail: the World's Fair Alweg trains shuttling
// their 0.9-mile beamway up Fifth Avenue between Westlake and Seattle Center,
// exactly as they have since 1962 — always the same two two-car trains, the
// Red one and the Blue one, each on its own parallel beam. Ambient paint like
// the T Line streetcar, NOT data: no honesty badge, deterministic from the
// scene clock, never presented as live. It is drawn deliberately more
// cartoonish than the Link fleet — rounder, bouncier, an older print pasted
// into a newer one — and given the affection of a family elder: it was
// gliding over these blocks before anything else in this scene ran.
//
// Liveries are painted from the real trains (reference photos, not invented):
// the Red train is warm cream with a red roofline, red bullet nose and red
// belt stripe over a fluted corrugated-aluminum skirt; the Blue train is deep
// Alweg blue under a pale roof cap, a lighter sky-blue belt above the same
// fluted silver skirt, wearing the big wraparound windshield.
//
// Three draw calls, matching the Tacoma pattern: the elevated beam strip
// (renderOrder 5, beside the roads), one merged geometry of concrete pylons
// carrying it (renderOrder 5), and ONE InstancedMesh for both trains with a
// per-instance `aTrain` flag selecting the livery in the shader — the
// red/blue split is structural, like the airliners' Delta/Alaska halves.
// Poses are written imperatively in useFrame (hot path never touches React);
// every layer mixes toward LIVE.fog itself and stays under the bright-paper
// bloom ceiling. The slight BOUNCE is the signature: a small vertical bob and
// nose-nod while under way, stilled at the platforms.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { projectLatLng } from "./network";
import { buildStrip } from "./ribbon";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

// The real alignment: Westlake Center (Fifth & Pine) straight up Fifth
// Avenue, the gentle bend at Broad Street, into the Seattle Center terminal
// beside MoPOP — block corners hand-lifted to lat/lng like the T Line so the
// beam lands over the accurately-built downtown below.
export const MONORAIL_LATLNGS: [number, number][] = [
  [47.6119, -122.33755], // Westlake Center terminal (5th & Pine)
  [47.6132, -122.33905], // 5th & Stewart
  [47.6144, -122.34045], // 5th & Virginia
  [47.615, -122.34115], //  5th & Lenora
  [47.6157, -122.34195], // 5th & Blanchard
  [47.6163, -122.34275], // 5th & Bell
  [47.617, -122.34355], //  5th & Battery
  [47.6176, -122.34435], // 5th & Wall
  [47.6182, -122.34515], // 5th & Vine
  [47.6188, -122.3459], //  5th & Cedar
  [47.6194, -122.3466], //  the Broad St bend
  [47.6199, -122.3477], //  curving into the Center grounds
  [47.62045, -122.34875], // Seattle Center terminal (beside MoPOP)
];

// Beam deck height over the paper — elevated above the street cars, well
// under the downtown towers, so the crossing at Fifth Ave reads.
const BEAM_Y = 0.045;
// Each train keeps its own beam: a fixed lateral offset off the centerline.
const BEAM_GAUGE = 0.011;

interface Pose {
  x: number;
  z: number;
  yaw: number;
  moving: number; // 0 dwelling .. 1 under way (eased at the platforms)
}

interface Route {
  pts: { x: number; z: number }[];
  cum: number[];
  lengthKm: number;
}

function route(latlngs: [number, number][], side: number): Route {
  const raw = latlngs.map(([lat, lng]) => projectLatLng(lat, lng));
  // Push the alignment onto this train's own beam: offset each point along
  // the averaged perpendicular, the same miter buildStrip uses.
  const pts = raw.map((p, i) => {
    const a = raw[Math.max(0, i - 1)];
    const b = raw[Math.min(raw.length - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    return { x: p.x + (-(b.z - a.z) / len) * side, z: p.z + ((b.x - a.x) / len) * side };
  });
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  }
  return { pts, cum, lengthKm: cum[cum.length - 1] };
}

interface Train {
  route: Route;
  toyLengthKm: number;
  speedKmS: number; // storybook pace, kin to the T Line
  dwellS: number; // held at each terminal
  phase: number; // fraction of the round trip already run at t = 0
}

const pose: Pose = { x: 0, z: 0, yaw: 0, moving: 0 };

/** Ping-pong along the beam with a dwell at each terminal, like the T Line —
 *  which is also how the real trains have run since the World's Fair. */
function trainPoseAt(v: Train, t: number, out: Pose = pose): Pose {
  const runS = v.route.lengthKm / v.speedKmS;
  const period = 2 * (runS + v.dwellS);
  const p = (t + v.phase * period) % period;
  let s: number;
  let fwd = true;
  if (p < runS) {
    s = p * v.speedKmS;
  } else if (p < runS + v.dwellS) {
    s = v.route.lengthKm;
  } else if (p < 2 * runS + v.dwellS) {
    s = v.route.lengthKm - (p - runS - v.dwellS) * v.speedKmS;
    fwd = false;
  } else {
    s = 0;
    fwd = false;
  }
  // The bounce eases in leaving a platform and out arriving at one.
  const leg = p < runS ? p : p < runS + v.dwellS ? -1 : p < 2 * runS + v.dwellS ? p - runS - v.dwellS : -1;
  out.moving =
    leg < 0
      ? 0
      : Math.min(1, leg / 6) * Math.min(1, (runS - leg) / 6);

  const { pts, cum } = v.route;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const f = THREE.MathUtils.clamp((s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]), 0, 1);
  const a = pts[i - 1];
  const b = pts[i];
  out.x = a.x + (b.x - a.x) * f;
  out.z = a.z + (b.z - a.z) * f;
  const dirX = fwd ? b.x - a.x : a.x - b.x;
  const dirZ = fwd ? b.z - a.z : a.z - b.z;
  out.yaw = Math.atan2(-dirZ, dirX);
  return out;
}

// Red keeps the west beam, Blue the east — counter-phased so one train is
// usually somewhere over Fifth Avenue while the other rests at a platform.
const TRAINS: Train[] = [
  { route: route(MONORAIL_LATLNGS, +BEAM_GAUGE), toyLengthKm: 0.13, speedKmS: 0.024, dwellS: 26, phase: 0.0 },
  { route: route(MONORAIL_LATLNGS, -BEAM_GAUGE), toyLengthKm: 0.13, speedKmS: 0.024, dwellS: 26, phase: 0.5 },
];

const TRAIN_VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aTrain; // 0 = the Red train, 1 = the Blue train
  varying vec3 vLocal;
  varying float vTrain;
  void main() {
    vLocal = position;
    vTrain = aTrain;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const TRAIN_FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying vec3 vLocal;
  varying float vTrain;
  uniform vec3 uBody;    // washi cream — the Red train's coat, the Blue's roof
  uniform vec3 uRed;     // 1962 Alweg red
  uniform vec3 uBlue;    // 1962 Alweg blue
  uniform vec3 uSky;     // the Blue train's lighter belt stripe
  uniform vec3 uSilver;  // fluted corrugated-aluminum skirt, both trains
  uniform vec3 uWindow;
  uniform float uWindowIntensity;
  uniform float uOpacity;
  void main() {
    // vLocal spans x in [-0.5,0.5] (length), y in [0,~0.24] (height).
    float wash = wcFbm(vWorld * 1.5 + vLocal.y * 3.0);
    float nose = smoothstep(0.36, 0.46, abs(vLocal.x)); // the bullet ends

    // The corrugated skirt: silver with vertical fluting, straight from the
    // photos — both trains wear it. The flutes are a fine ink comb.
    float skirtTop = 0.085;
    float skirt = 1.0 - smoothstep(skirtTop - 0.012, skirtTop, vLocal.y);
    float flute = 0.82 + 0.18 * sin(vLocal.x * 340.0);
    vec3 skirtC = uSilver * flute;

    // Red livery: cream body, red belt just above the skirt, red roofline.
    vec3 red = uBody;
    float belt = smoothstep(skirtTop, skirtTop + 0.008, vLocal.y) *
                 (1.0 - smoothstep(0.115, 0.125, vLocal.y));
    red = mix(red, uRed, belt * 0.95);
    red = mix(red, uRed, smoothstep(0.2, 0.215, vLocal.y)); // roofline
    red = mix(red, uRed, nose * 0.95); // the red bullet nose

    // Blue livery: deep blue coat, sky-blue belt, pale roof cap.
    vec3 blue = uBlue;
    blue = mix(blue, uSky, belt * 0.9);
    blue = mix(blue, uBody, smoothstep(0.205, 0.22, vLocal.y)); // pale roof

    vec3 c = mix(red, blue, vTrain);

    // The glass: a dashed window run on the flanks, and the famous wraparound
    // windshield flooding each bullet nose — lit warm by MIX, never bloom.
    float band = smoothstep(0.12, 0.135, vLocal.y) * (1.0 - smoothstep(0.19, 0.202, vLocal.y));
    float dash = step(0.35, wcHash(vec2(floor(vLocal.x * 30.0), 7.3)));
    float glass = max(band * dash, band * nose * 1.2);
    c = mix(c, uWindow * (0.18 + uWindowIntensity), clamp(glass, 0.0, 1.0) * 0.85);

    c = mix(c, skirtC, skirt);
    c *= 0.86 + 0.28 * wash; // the woodblock wash over everything

    float a = uOpacity * (0.9 + 0.2 * wash);
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), a);
  }
`;

const BEAM_VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vWorld = position.xz;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const BEAM_FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uIntensity;
  void main() {
    float across = abs(vUv.y * 2.0 - 1.0);
    // A solid ink stroke — the beamway must READ as a line from drift
    // distance, like the rail ribbons — with the two beam edges drawn a
    // shade darker so up close it still resolves into the dual-beam way.
    float core = smoothstep(1.0, 0.85, across);
    float edges = smoothstep(0.35, 0.6, across);
    float dapple = 0.8 + 0.2 * wcNoise(vWorld * 4.0);
    vec3 c = mix(uColor, uFog, fogFactor());
    gl_FragColor = vec4(c * (1.0 - 0.25 * edges), core * dapple * uIntensity);
  }
`;

const PYLON_VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  varying float vY;
  void main() {
    vY = position.y;
    vWorld = position.xz;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const PYLON_FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying float vY;
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    float wash = wcFbm(vWorld * 3.0 + vY * 6.0);
    // Pigment pools at the pylon foot, the page shows through near the deck.
    vec3 c = uColor * (0.8 + 0.3 * wash) * mix(1.0, 0.85, vY / ${BEAM_Y.toFixed(3)});
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), uOpacity * 0.9);
  }
`;

/** Unit-length two-car Alweg train along +X, floor at y = 0: two rounded car
 *  bodies with the bullet ends, a slim roof cap each, and the short coupled
 *  gap — kept toy-simple; the paint carries the identity. */
function buildTrain(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const cx of [-0.245, 0.245]) {
    const body = new THREE.BoxGeometry(0.45, 0.2, 0.15);
    body.translate(cx, 0.11, 0);
    parts.push(body);
    const roof = new THREE.BoxGeometry(0.4, 0.035, 0.12);
    roof.translate(cx, 0.222, 0);
    parts.push(roof);
  }
  // The straddle skirt hugging the beam below the floor line.
  const straddle = new THREE.BoxGeometry(0.94, 0.03, 0.1);
  straddle.translate(0, -0.005, 0);
  parts.push(straddle);
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  // aTrain is per-INSTANCE: instance 0 is the Red train, instance 1 the Blue.
  merged.setAttribute("aTrain", new THREE.InstancedBufferAttribute(new Float32Array([0, 1]), 1));
  return merged;
}

/** One merged geometry of concrete pylons pacing the beamway. */
function buildPylons(): THREE.BufferGeometry {
  const raw = MONORAIL_LATLNGS.map(([lat, lng]) => projectLatLng(lat, lng));
  const parts: THREE.BufferGeometry[] = [];
  const step = 0.055; // km between pylons — the real close-paced colonnade
  for (let i = 1; i < raw.length; i++) {
    const a = raw[i - 1];
    const b = raw[i];
    const seg = Math.hypot(b.x - a.x, b.z - a.z);
    for (let s = i === 1 ? 0 : step / 2; s < seg; s += step) {
      const f = s / seg;
      const p = new THREE.BoxGeometry(0.008, BEAM_Y, 0.02);
      p.translate(a.x + (b.x - a.x) * f, BEAM_Y / 2, a.z + (b.z - a.z) * f);
      parts.push(p);
    }
  }
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  return merged;
}

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const nod = new THREE.Quaternion();
const scale = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const PITCH_AXIS = new THREE.Vector3(0, 0, 1);

// Fixed 1962 pigments — identity bands like the T Line's navy skirt, held
// well under the bloom ceiling; opacity carries the day/night dimming.
const RED = new THREE.Color("#b5372a"); // Alweg red — vermilion leaning brick
const BLUE = new THREE.Color("#2c5c8f"); // Alweg blue
const SKY = new THREE.Color("#8fb4cd"); // the Blue train's lighter belt
const SILVER = new THREE.Color("#b3ae9f"); // corrugated aluminum, warmed to the paper
const CONCRETE = new THREE.Color("#9b8f76"); // the pylon concrete, aged warm
const BEAM_INK = new THREE.Color("#6a5d45"); // the beamway stroke — a real sumi line, darker than the streets

export function Monorail() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const trainMatRef = useRef<THREE.ShaderMaterial>(null);
  const beamMatRef = useRef<THREE.ShaderMaterial>(null);
  const pylonMatRef = useRef<THREE.ShaderMaterial>(null);
  const trainGeometry = useMemo(buildTrain, []);
  const pylonGeometry = useMemo(buildPylons, []);
  const beamGeometry = useMemo(() => {
    const pts = MONORAIL_LATLNGS.map(([lat, lng]) => {
      const { x, z } = projectLatLng(lat, lng);
      return [x, z] as [number, number];
    });
    return buildStrip(pts, { widthKm: BEAM_GAUGE * 2 + 0.022, y: BEAM_Y });
  }, []);

  useFrame(() => {
    const mesh = meshRef.current;
    const m = trainMatRef.current;
    if (!mesh || !m) return;
    m.uniforms.uOpacity.value = LIVE.ferryOpacity;
    m.uniforms.uWindowIntensity.value = LIVE.windowIntensity;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;
    if (beamMatRef.current) {
      // Boldest stroke on the page after the rail ribbons themselves — the
      // roads' ink weight was vanishing under the downtown fabric.
      beamMatRef.current.uniforms.uIntensity.value = Math.min(1, LIVE.roadIntensity * 1.7);
      beamMatRef.current.uniforms.uFogDensity.value = LIVE.fogDensity;
    }
    if (pylonMatRef.current) {
      pylonMatRef.current.uniforms.uOpacity.value = LIVE.landmarkOpacity * 0.85;
      pylonMatRef.current.uniforms.uFogDensity.value = LIVE.fogDensity;
    }
    for (let i = 0; i < TRAINS.length; i++) {
      const v = TRAINS[i];
      const { x, z, yaw, moving } = trainPoseAt(v, CLOCK.t);
      // The slight bounce — the ride everyone remembers: a small bob and a
      // gentle nose-nod while under way, stilled at the platforms. Cartoonish
      // on purpose; the Link fleet glides, the elder is allowed to skip.
      const bob = Math.sin(CLOCK.t * 2.1 + i * 2.7) * 0.0022 * moving;
      const pitch = Math.sin(CLOCK.t * 1.55 + i * 1.9) * 0.02 * moving;
      quaternion.setFromAxisAngle(UP, yaw);
      nod.setFromAxisAngle(PITCH_AXIS, pitch);
      quaternion.multiply(nod);
      matrix.compose(
        position.set(x, BEAM_Y + 0.004 + bob, z),
        quaternion,
        scale.setScalar(v.toyLengthKm)
      );
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      {/* Above the building fabric (6.2), just under its own trains (6.25):
          an elevated line hidden behind every tower isn't a line at all. */}
      <mesh geometry={beamGeometry} renderOrder={6.22} frustumCulled={false}>
        <shaderMaterial
          ref={beamMatRef}
          vertexShader={BEAM_VERT}
          fragmentShader={BEAM_FRAG}
          uniforms={{
            uColor: { value: BEAM_INK },
            uIntensity: { value: 1 },
            uFog: { value: LIVE.fog }, // palette-by-reference
            uFogDensity: { value: LIVE.fogDensity },
          }}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={pylonGeometry} renderOrder={5} frustumCulled={false}>
        <shaderMaterial
          ref={pylonMatRef}
          vertexShader={PYLON_VERT}
          fragmentShader={PYLON_FRAG}
          uniforms={{
            uColor: { value: CONCRETE },
            uOpacity: { value: 1 },
            uFog: { value: LIVE.fog },
            uFogDensity: { value: LIVE.fogDensity },
          }}
          transparent
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, TRAINS.length]}
        geometry={trainGeometry}
        // Above the building fabric (6.2), below the airliners (6.3): the
        // little trains ride an elevated beam through downtown and must never
        // vanish under a tower's paint.
        renderOrder={6.25}
        frustumCulled={false}
      >
        <shaderMaterial
          ref={trainMatRef}
          vertexShader={TRAIN_VERT}
          fragmentShader={TRAIN_FRAG}
          uniforms={{
            uBody: { value: LIVE.ferry }, // pale washi coat, lantern-warm at night
            uRed: { value: RED },
            uBlue: { value: BLUE },
            uSky: { value: SKY },
            uSilver: { value: SILVER },
            uWindow: { value: LIVE.trainWindow },
            uWindowIntensity: { value: LIVE.windowIntensity },
            uOpacity: { value: LIVE.ferryOpacity },
            uFog: { value: LIVE.fog },
            uFogDensity: { value: LIVE.fogDensity },
          }}
          transparent
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </instancedMesh>
    </>
  );
}
