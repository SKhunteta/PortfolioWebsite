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
// Treatment is Canoe-tier restraint: one pure sumi silhouette — the round,
// fuzzy-ball body that made him famous, a small head tucked onto the front,
// four bunched stub legs, and a big bushy ringtail trailing out behind — a
// respectful little mark in the print's own language, NOT a cartoon. He is
// deliberately storybook-sized (smaller than the canoe) so he reads as the
// tiny thing he is without vanishing at drift distance.
//
// His stops are GARBAGE CANS: three little sumi alley cans (two standing at
// his rummage points — his nose lands right in the mouth of them — and one
// already knocked over, the classic scene of the crime). The cans are
// furniture, on stage all day whether or not Jimothy is; when he arrives he
// pitches nose-down into one and works it with a busy head-wiggle.
//
// TWO InstancedMeshes (two draw calls): Jimothy's matrix written imperatively
// in useFrame, the cans' matrices placed once. The hot path never touches
// React. NORMAL-blended ink with the fog contract, renderOrder 6 beside the
// canoe/ferries, depthWrite false; Jimothy hides himself outside the twilight
// windows so midday and deep night cost only the static cans.
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
    float tailZone = smoothstep(-0.3, -0.44, vLocal.x);
    float rings = 0.5 + 0.5 * sin(vLocal.x * 40.0);
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

// Spry: he trots, faster than the canoe pulls. Two brief pause beats per loop
// — and each stop is a GARBAGE CAN: he noses right into it, the true raccoon
// errand ("very spry but stops to investigate everything").
const SPEED_KM_S = 0.018;
const SNIFF_S = 3.5;
const SNIFF_AT = [0.34, 0.72]; // arc-length fractions where he stops to rummage
const TOY_LENGTH_KM = 0.032; // storybook-tiny, clearly smaller than the canoe
const GAIT_HZ = 3.2; // the quick waddle bob

/** Point + segment heading at arc length s along the loop. */
function loopPointAt(s: number): { x: number; z: number; yaw: number } {
  const { pts, cum } = BEAT;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const f = THREE.MathUtils.clamp((s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]), 0, 1);
  const a = pts[i - 1];
  const b = pts[i];
  return {
    x: a.x + (b.x - a.x) * f,
    z: a.z + (b.z - a.z) * f,
    yaw: Math.atan2(-(b.z - a.z), b.x - a.x),
  };
}

// The cans live where he stops: one standing just past each rummage point (so
// his nose lands in the mouth of it), plus one he's already knocked over
// earlier on the loop — the classic scene of the crime. Fixtures of the alley,
// on stage all day whether or not Jimothy is; deterministic like everything.
const CAN_NOSE_REACH_KM = 0.55 * TOY_LENGTH_KM; // snout-to-can-mouth distance
const CANS = [
  ...SNIFF_AT.map((f) => {
    const p = loopPointAt(f * BEAT.lengthKm);
    return {
      x: p.x + Math.cos(p.yaw) * CAN_NOSE_REACH_KM,
      z: p.z - Math.sin(p.yaw) * CAN_NOSE_REACH_KM,
      yaw: p.yaw + 0.4, // lids askew — nobody's alley cans line up
      tipped: false,
    };
  }),
  (() => {
    const p = loopPointAt(0.12 * BEAT.lengthKm);
    return {
      x: p.x - Math.sin(p.yaw) * 0.02, // off the path to one side
      z: p.z - Math.cos(p.yaw) * 0.02,
      yaw: p.yaw - 1.1,
      tipped: true, // already been visited
    };
  })(),
];

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

/** Unit Jimothy along +X, feet at y = 0: the real raccoon is famously ROUND —
 *  short-spine syndrome pulls him into a fuzzy ball, his whole viral charm. So
 *  the body is a genuine sphere (boxes can't be round), the head a smaller ball
 *  tucked onto the front with barely a neck, short legs bunched beneath, and a
 *  SHORT bushy ringtail — a compact fluffy puff hugging close behind, not a
 *  long plume. Round is the whole point of him. */
function buildJimothy(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // Woodblock-simple sphere resolution — smooth enough to read round at the
  // print's distance, cheap on one merged instance.
  const ball = (r: number) => new THREE.SphereGeometry(r, 14, 10);

  // The body: a big round ball, a touch taller than long the way a short spine
  // stacks him up.
  const body = ball(0.32);
  body.scale(0.96, 1.06, 1.0);
  body.translate(0.0, 0.34, 0);
  parts.push(body);

  // Head: a smaller ball tucked onto the front, low, almost no neck.
  const head = ball(0.17);
  head.translate(0.3, 0.3, 0);
  parts.push(head);
  // A short snout nub and two little ears.
  const snout = ball(0.08);
  snout.scale(1.3, 0.85, 0.85);
  snout.translate(0.44, 0.26, 0);
  parts.push(snout);
  for (const side of [-1, 1]) {
    const ear = ball(0.055);
    ear.translate(0.28, 0.43, side * 0.1);
    parts.push(ear);
  }

  // Four short legs, bunched close the way a short spine draws them together.
  for (const fx of [0.16, -0.14]) {
    for (const side of [-1, 1]) {
      const leg = new THREE.BoxGeometry(0.09, 0.14, 0.09);
      leg.translate(fx, 0.07, side * 0.15);
      parts.push(leg);
    }
  }

  // The ringtail: SHORT and bushy — a compact fluffy puff hugging close behind
  // the body, not a long trailing plume. Thick at the base, tapering just a
  // little. Banded in the shader.
  const tailSpec: [number, number, number][] = [
    // x, y, radius
    [-0.32, 0.31, 0.2],
    [-0.45, 0.25, 0.16],
    [-0.55, 0.19, 0.12],
  ];
  for (const [x, y, r] of tailSpec) {
    const seg = ball(r);
    seg.translate(x, y, 0);
    parts.push(seg);
  }

  const merged = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  return merged;
}

/** Unit garbage can, base at y = 0: a slightly tapered alley can with a
 *  wider brimmed lid sitting askew and a little knob handle — the woodblock
 *  shorthand for "trash can", no label, no litter. About Jimothy's height. */
function buildCan(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const body = new THREE.CylinderGeometry(0.2, 0.17, 0.5, 10);
  body.translate(0, 0.25, 0);
  parts.push(body);
  const lid = new THREE.CylinderGeometry(0.24, 0.24, 0.05, 10);
  lid.rotateZ(0.12); // resting askew — the raccoon neighborhood tell
  lid.translate(0.02, 0.53, 0);
  parts.push(lid);
  const knob = new THREE.SphereGeometry(0.045, 8, 6);
  knob.translate(0.03, 0.58, 0);
  parts.push(knob);
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
  const cansRef = useRef<THREE.InstancedMesh>(null);
  const cansMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(buildJimothy, []);
  const canGeometry = useMemo(buildCan, []);
  const captioned = useRef(false);
  const cansPlaced = useRef(false);

  useFrame(() => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;

    // The cans are furniture: placed once, on stage all day (a raccoon's cans
    // don't come out only at dusk). Their material still follows the palette
    // and fog by reference each frame.
    const cans = cansRef.current;
    const cm = cansMaterialRef.current;
    if (cans && cm) {
      cm.uniforms.uFogDensity.value = LIVE.fogDensity;
      if (!cansPlaced.current) {
        cansPlaced.current = true;
        for (let i = 0; i < CANS.length; i++) {
          const c = CANS[i];
          // The tipped can lies on its side, rolled onto the lid seam.
          euler.set(c.tipped ? Math.PI / 2 : 0, c.yaw, 0, "YXZ");
          quaternion.setFromEuler(euler);
          matrix.compose(
            position.set(c.x, c.tipped ? 0.2 * TOY_LENGTH_KM : 0, c.z),
            quaternion,
            scale.setScalar(TOY_LENGTH_KM),
          );
          cans.setMatrixAt(i, matrix);
        }
        cans.instanceMatrix.needsUpdate = true;
        cans.visible = true;
      }
    }

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
    // The waddle: a quick vertical bob and a little roll while he trots. At
    // each stop he RUMMAGES — nose pitched down into the can that stands
    // there, haunches up, with a busy little head-wiggle worked in.
    const g = CLOCK.t * GAIT_HZ * Math.PI * 2;
    const rummage = 1 - moving;
    const bob = moving * 0.05 * Math.abs(Math.sin(g));
    const roll = moving * 0.12 * Math.sin(g) + rummage * 0.06 * Math.sin(CLOCK.t * 11);
    const pitch = rummage * 0.5; // nose dives into the can's mouth
    euler.set(pitch, yaw + rummage * 0.07 * Math.sin(CLOCK.t * 14), roll, "YXZ");
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
    <>
      <instancedMesh
        ref={cansRef}
        args={[undefined, undefined, CANS.length]}
        geometry={canGeometry}
        renderOrder={6}
        frustumCulled={false}
        visible={false}
      >
        <shaderMaterial
          ref={cansMaterialRef}
          vertexShader={VERT}
          fragmentShader={FRAG}
          uniforms={{
            // Same sumi treatment as Jimothy, but the cans never gate: uFade
            // holds at 1 and only the shared fog contract dims them.
            uInk: { value: LIVE.landmark },
            uFade: { value: 1 },
            uOpacity: { value: 0.85 },
            uFog: { value: LIVE.fog },
            uFogDensity: { value: LIVE.fogDensity },
          }}
          transparent
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </instancedMesh>
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
    </>
  );
}
