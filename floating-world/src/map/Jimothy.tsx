// Jimothy — the round raccoon of Ballard. In July 2026 a young raccoon with
// short-spine syndrome (torso pulled almost spherical, no neck, front and rear
// legs bunched close) was filmed one evening near the Ballard Goodwill and
// became the neighborhood's beloved internet celebrity — famously "very spry"
// with it, running and climbing fine. He lives in the print as a resident
// Easter egg at the crow commute's honesty tier: no calendar and no live
// sighting, just the crepuscular hours a raccoon actually keeps, scampering a
// small deterministic loop near the Locks where he was seen. Ambient paint,
// never presented as data.
//
// Treatment is Canoe-tier restraint: one pure sumi silhouette — a low, squared
// loaf of a body carried close to the ground, a forward head and pointed
// snout, four bunched stub legs, and a big bushy ringtail streaming out behind
// — a respectful little mark in the print's own language, NOT a cartoon. He is
// deliberately storybook-sized (smaller than the canoe) so he reads as the
// tiny thing he is without vanishing at drift distance.
//
// ONE InstancedMesh (one draw call), the matrix written imperatively in
// useFrame — the hot path never touches React. NORMAL-blended ink with the fog
// contract, renderOrder 6 beside the canoe/ferries, depthWrite false, and the
// mesh hides itself outside the twilight windows so midday and deep night cost
// nothing.
//
// ?jimothy=on|off pins him for demos, tests and screenshots.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { projectLatLng } from "./network";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { sunPhase } from "../world/sun";
import { jimothyOverride } from "../world/jimothy";
import { useUi } from "../trains/store";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

const ss = THREE.MathUtils.smoothstep;

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
  uniform vec3 uInk;
  uniform float uFade;
  uniform float uOpacity;
  void main() {
    if (uFade < 0.004) discard;
    // Pure sumi: the ink pools a touch at ground level and the wash breaks the
    // stroke like a dry brush, same as the canoe hull.
    float wash = wcFbm(vWorld * 2.4 + vLocal.x * 2.0);
    vec3 c = uInk * 0.55 * (0.88 + 0.28 * wash);
    c *= mix(1.06, 0.9, smoothstep(0.0, 0.32, vLocal.y));
    // The ringtail: faint sumi bands only on the tail's reach behind the rump
    // (x well negative), so the little mark still reads as a ringtailed raccoon
    // and not just a blob.
    float tailZone = smoothstep(-0.38, -0.52, vLocal.x);
    float rings = 0.5 + 0.5 * sin(vLocal.x * 38.0);
    c *= mix(1.0, mix(0.66, 1.1, rings), tailZone);
    float a = uOpacity * uFade * (0.9 + 0.2 * wash);
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), a);
  }
`;

interface Loop {
  pts: { x: number; z: number }[];
  cum: number[];
  lengthKm: number;
}

// A closed wander — last point repeats the first so the arc-length walk loops
// seamlessly with no ping-pong turn.
function loop(latlngs: [number, number][]): Loop {
  const pts = latlngs.map(([lat, lng]) => projectLatLng(lat, lng));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  }
  return { pts, cum, lengthKm: cum[cum.length - 1] };
}

// A small block-loop off Leary Way by the Ballard Goodwill (~47.6689,
// −122.3826), a few blocks southeast of the Locks already in Landmarks.tsx.
const BEAT = loop([
  [47.6689, -122.3826],
  [47.6692, -122.3819],
  [47.6688, -122.3812],
  [47.6684, -122.3818],
  [47.6686, -122.3827],
  [47.6689, -122.3826],
]);

// Spry: he trots, faster than the canoe pulls. Two brief pause-and-sniff beats
// per loop — the "very spry but stops to investigate everything" of him.
const SPEED_KM_S = 0.018;
const SNIFF_S = 3.5;
const SNIFF_AT = [0.34, 0.72]; // arc-length fractions where he stops to sniff
const TOY_LENGTH_KM = 0.032; // storybook-tiny, clearly smaller than the canoe
const GAIT_HZ = 3.2; // the quick waddle bob

interface Pose {
  x: number;
  z: number;
  yaw: number;
  moving: number; // 1 trotting, eases to 0 while sniffing
}

const pose: Pose = { x: 0, z: 0, yaw: 0, moving: 1 };

/** Where Jimothy is at clock time t: a steady trot around the block with two
 *  brief sniff-stops. Nose always faces the way he trots. Exported so the dev
 *  handle / smoke harness can locate him deterministically. */
export function jimothyPoseAt(t: number, out: Pose = pose): Pose {
  const runS = BEAT.lengthKm / SPEED_KM_S;
  const period = runS + SNIFF_AT.length * SNIFF_S;
  const p = ((t % period) + period) % period;

  // Walk the timeline: advance arc length at speed, holding still through each
  // sniff window as its fraction comes up.
  let elapsed = 0;
  let s = 0;
  let moving = 1;
  const sniffLenS = SNIFF_AT.map((f) => f * BEAT.lengthKm); // arc length of each stop
  for (let k = 0; k <= SNIFF_AT.length; k++) {
    const segEndS = k < SNIFF_AT.length ? sniffLenS[k] : BEAT.lengthKm;
    const legDur = (segEndS - s) / SPEED_KM_S;
    if (p < elapsed + legDur) {
      s += (p - elapsed) * SPEED_KM_S;
      moving = 1;
      break;
    }
    s = segEndS;
    elapsed += legDur;
    if (k < SNIFF_AT.length) {
      if (p < elapsed + SNIFF_S) {
        // mid-sniff: eased dip in and out of stillness
        const u = (p - elapsed) / SNIFF_S;
        moving = 1 - Math.sin(Math.PI * THREE.MathUtils.clamp(u, 0, 1));
        break;
      }
      elapsed += SNIFF_S;
    }
  }

  const { pts, cum } = BEAT;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const f = THREE.MathUtils.clamp((s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]), 0, 1);
  const a = pts[i - 1];
  const b = pts[i];
  out.x = a.x + (b.x - a.x) * f;
  out.z = a.z + (b.z - a.z) * f;
  out.yaw = Math.atan2(-(b.z - a.z), b.x - a.x);
  out.moving = moving;
  return out;
}

/** Unit Jimothy along +X, feet at y = 0: the real raccoon reads as a low,
 *  SQUARED loaf carried close to the ground — longer than it is tall, blocky
 *  rather than spherical — with the short-spine legs bunched under it, a low
 *  forward head and pointed snout, and a big bushy ringtail streaming straight
 *  out BEHIND him, near-horizontal with a slight droop. Square is the point. */
function buildJimothy(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // The body: a squared, low-slung loaf — clearly longer than tall. A slight
  // rump box behind lifts the haunches the way he humps when he runs, but the
  // silhouette stays boxy, not round.
  const body = new THREE.BoxGeometry(0.62, 0.4, 0.44);
  body.translate(0.0, 0.28, 0);
  parts.push(body);
  const rump = new THREE.BoxGeometry(0.26, 0.42, 0.42);
  rump.translate(-0.2, 0.3, 0);
  parts.push(rump);

  // Head set low and forward off the front of the loaf — barely any neck.
  const head = new THREE.BoxGeometry(0.24, 0.22, 0.24);
  head.translate(0.36, 0.22, 0);
  parts.push(head);
  // Pointed snout, dropping forward toward the ground.
  const snout = new THREE.BoxGeometry(0.16, 0.11, 0.13);
  snout.translate(0.52, 0.17, 0);
  parts.push(snout);
  // Two small ear nubs.
  for (const side of [-1, 1]) {
    const ear = new THREE.BoxGeometry(0.07, 0.08, 0.07);
    ear.translate(0.32, 0.35, side * 0.09);
    parts.push(ear);
  }

  // Four stub legs, bunched close the way a short spine draws them together.
  for (const fx of [0.2, -0.16]) {
    for (const side of [-1, 1]) {
      const leg = new THREE.BoxGeometry(0.09, 0.13, 0.09);
      leg.translate(fx, 0.065, side * 0.16);
      parts.push(leg);
    }
  }

  // The ringtail: a big bushy tail held straight out behind, near-horizontal
  // with a slight downward droop toward the tip — long and thick, ~the length
  // of the body. Banded in the shader.
  const tailSpec: [number, number, number, number][] = [
    // x, y, size, rotZ (small negative rotZ droops the tip earthward)
    [-0.42, 0.29, 0.22, -0.06],
    [-0.62, 0.27, 0.2, -0.14],
    [-0.8, 0.23, 0.16, -0.22],
    [-0.94, 0.18, 0.12, -0.3],
  ];
  for (const [x, y, sz, rz] of tailSpec) {
    const seg = new THREE.BoxGeometry(sz * 1.15, sz, sz);
    seg.rotateZ(rz);
    seg.translate(x, y, 0);
    parts.push(seg);
  }

  const merged = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  return merged;
}

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const euler = new THREE.Euler();
const scale = new THREE.Vector3();

export function Jimothy() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(buildJimothy, []);
  const captioned = useRef(false);

  useFrame(() => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;

    const override = jimothyOverride();
    if (override === false) {
      mesh.visible = false;
      return;
    }

    // Crepuscular, like the crow commute: the same twilight band lifts him at
    // dusk and dawn — the hours a raccoon is actually out, and the hour he was
    // filmed. ?jimothy=on lifts the gate to full so he shows at any phase.
    const p = sunPhase();
    const band = ss(p, 0.03, 0.18) * (1 - ss(p, 0.4, 0.65));
    const fade = override === true ? 1 : Math.min(0.95, band);

    if (fade < 0.004) {
      mesh.visible = false; // midday and deep night cost nothing
      return;
    }
    mesh.visible = true;

    // One quiet caption on first sighting — the Easter-egg payoff.
    if (!captioned.current && fade > 0.5) {
      captioned.current = true;
      useUi.getState().setCaption("Jimothy, Ballard's round raccoon, on his evening rounds");
    }

    m.uniforms.uFade.value = fade;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;

    const { x, z, yaw, moving } = jimothyPoseAt(CLOCK.t);
    // The waddle: a quick vertical bob and a little roll while he trots, easing
    // flat while he stops to sniff, with a small nose-down pitch mid-sniff.
    const g = CLOCK.t * GAIT_HZ * Math.PI * 2;
    const bob = moving * 0.05 * Math.abs(Math.sin(g));
    const roll = moving * 0.12 * Math.sin(g);
    const pitch = (1 - moving) * 0.35; // nose dips to the ground on a sniff
    euler.set(pitch, yaw, roll, "YXZ");
    quaternion.setFromEuler(euler);
    matrix.compose(
      position.set(x, bob * TOY_LENGTH_KM, z),
      quaternion,
      scale.setScalar(TOY_LENGTH_KM),
    );
    mesh.setMatrixAt(0, matrix);
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, 1]}
      geometry={geometry}
      renderOrder={6}
      frustumCulled={false}
      visible={false}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          // palette-by-reference: the stable sepia landmark ink, pulled deep
          // toward sumi in the shader (same choice as the canoe — the label ink
          // flips to cream after dark, wrong for a silhouette on the ground).
          uInk: { value: LIVE.landmark },
          uFade: { value: 0 },
          uOpacity: { value: 0.95 },
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
