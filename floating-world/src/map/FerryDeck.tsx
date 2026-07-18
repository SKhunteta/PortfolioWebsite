// Ferry deck life — the close-zoom reveal that turns each toy WSF boat from a
// token into a vessel. Zoom the camera in on a ferry mid-crossing and the deck
// populates: a handful of passenger dots stand along the promenade rail (one is
// ALWAYS at the bow, watching the crossing), and on cold days each one puffs a
// little breath into the air. One car deck below shows as a file of parked
// rectangles — but only on the car ferries: the West Seattle water taxi carries
// no cars, so its deck stays bare (honest, like everything else here).
//
// It is a strict LOD detail. At the ordinary drift distance the boats are still
// tokens and this layer HIDES ITSELF ENTIRELY (both meshes `visible = false`,
// zero draw cost) — exactly the gated-critter rule. It only wakes, and only
// fades its figures in, once the camera is within a few km of a hull; each
// vessel reveals on its OWN camera distance, so zooming onto one boat doesn't
// light up the one across the Sound.
//
// TWO instanced draw calls, matching the instanced-everything rule:
//   • passengers — view-facing billboards (PlatformLife's language), the figure
//     carved in the fragment shader with a breath puff drifting up above it;
//   • cars — flat rectangles lying on the vehicle deck, oriented with the hull.
// Poses are written imperatively in useFrame from the SAME ferryPoseAt() the
// hulls and wakes read, so the deck can never drift free of its boat; the hot
// path never touches React. Watercolor wash + fog contract like every other
// normal-blended layer, depthWrite false, renderOrder just over the hull (6).

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { COLD } from "../world/weather";
import { PROFILE } from "../world/device";
import { CONFIG } from "../world/config";
import { FERRY_VESSELS, ferryPoseAt, type VesselPose } from "./Ferries";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

// --- passenger billboard -----------------------------------------------------

const PASS_VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aSeed;    // per-figure scatter/animation seed
  attribute float aSize;    // figure height in world units (toy-scaled)
  attribute float aReveal;  // 0..1 LOD fade for this figure's vessel
  attribute float aBow;     // 1 = the lone figure that always rides the bow
  uniform float uTime;
  varying vec2 vUv;
  varying float vSeed;
  varying float vReveal;
  varying float vBow;
  void main() {
    vUv = uv;
    vSeed = aSeed;
    vReveal = aReveal;
    vBow = aBow;
    vec4 center = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vWorld = center.xz;
    vec4 mv = viewMatrix * center;
    // A standing crowd shifts its weight — a small bob and sway, each on its own
    // phase so the deck stirs rather than pulses.
    mv.x += sin(uTime * 0.8 + aSeed * 6.283) * aSize * 0.06;
    mv.y += sin(uTime * 1.9 + aSeed * 3.14) * aSize * 0.05;
    // View-facing billboard anchored at the feet (uv.y = 0 stands on the deck).
    // The quad is taller than the figure so there's headroom above for the
    // breath puff to drift into. Chunky (wide aspect) so a figure reads as a
    // standing dab, not a thin post, at close zoom.
    float aspect = 0.62;
    vec2 q = (uv - vec2(0.5, 0.0)) * vec2(aSize * aspect, aSize * 1.55);
    mv.xy += q;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const PASS_FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying vec2 vUv;
  varying float vSeed;
  varying float vReveal;
  varying float vBow;
  uniform vec3 uWarm;    // figure pigment — persimmon by day, amber by night (by ref)
  uniform vec3 uCoat;    // an ai-blue coat a few of the crowd wear
  uniform vec3 uBreath;  // cool paper-vapor for the breath puff
  uniform float uOpacity;
  uniform float uCold;   // 0..1 — how visible a breath is today
  uniform float uTime;
  void main() {
    if (vReveal < 0.01) discard;

    // The figure occupies the lower part of the quad; the rest is breath sky.
    const float figTop = 0.6;
    float fy = vUv.y / figTop;
    // A stout lozenge for the body, a small head above — a coat-and-shoulders
    // dab, not a stick.
    float body = 1.0 - smoothstep(0.3, 0.66, length((vec2(vUv.x, fy) - vec2(0.5, 0.34)) * vec2(1.7, 1.0)));
    float headM = 1.0 - smoothstep(0.09, 0.15, length((vec2(vUv.x, fy) - vec2(0.5, 0.76)) * vec2(1.4, 1.1)));
    float fig = vUv.y <= figTop ? clamp(max(body, headM * 0.95), 0.0, 1.0) : 0.0;

    // Muted warm figures (the persimmon toned down so a close crowd reads as
    // dressed people, not neon dabs), each a touch different in weight; a good
    // third wear a cool ai-blue coat so the rail isn't a uniform smear. The head
    // darkens to sumi so the dab reads as body-and-head.
    vec3 warm = uWarm * (0.52 + 0.16 * fract(vSeed * 1.37));
    float coat = step(0.6, fract(vSeed * 7.0));
    vec3 col = mix(warm, uCoat, coat * 0.7);
    col = mix(col, col * 0.5, smoothstep(0.6, 0.72, fy)); // hair/head reads darker

    // Breath: a soft puff rising from the mouth and dissipating, on a loop per
    // figure, only as cold as the day really is (uCold). Cool paper-vapor so it
    // reads against the Prussian water without breaking the bright-paper rule.
    float mouthY = figTop * 0.8;
    float rate = 0.32 + 0.22 * fract(vSeed * 3.1);
    float ph = fract(uTime * rate + vSeed);
    float rise = ph * (1.0 - mouthY) * 1.2;           // drifts up into the headroom
    vec2 bc = vec2(0.5 + (fract(vSeed * 5.0) - 0.5) * 0.1 + ph * 0.06, mouthY + rise);
    float grow = 0.03 + ph * 0.08;
    float cloud = 0.55 + 0.6 * wcNoise(vUv * 7.0 + vSeed * 10.0);
    float puff = (1.0 - smoothstep(grow * 0.3, grow, length((vUv - bc) * vec2(1.0, 0.85)))) * cloud;
    float breath = puff * uCold * (1.0 - ph) * smoothstep(0.0, 0.12, ph);

    float figA = fig * uOpacity * (0.62 + 0.38 * fract(vSeed));
    float brA = breath * 0.7;
    float a = max(figA, brA) * vReveal * (1.0 - fogFactor());
    if (a < 0.004) discard;
    // Breath pixels take the cool vapor colour; the figure stays warm pigment.
    vec3 outc = mix(col, uBreath, step(figA, brA));
    gl_FragColor = vec4(mix(outc, uFog, fogFactor()), a);
  }
`;

// --- parked-car deck ---------------------------------------------------------

const CAR_VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aSeed;
  attribute float aReveal;
  varying vec2 vUv;
  varying float vSeed;
  varying float vReveal;
  void main() {
    vUv = uv;
    vSeed = aSeed;
    vReveal = aReveal;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const CAR_FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying vec2 vUv;
  varying float vSeed;
  varying float vReveal;
  uniform float uOpacity;

  // A few muted woodblock car colours, all well under the bright-paper ceiling.
  vec3 carHue(float s) {
    float k = floor(s * 5.0);
    if (k < 1.0) return vec3(0.20, 0.19, 0.18); // sumi near-black
    if (k < 2.0) return vec3(0.27, 0.33, 0.42); // ai blue
    if (k < 3.0) return vec3(0.55, 0.29, 0.23); // vermilion-brown
    if (k < 4.0) return vec3(0.72, 0.66, 0.52); // cream
    return vec3(0.40, 0.45, 0.37);              // moss
  }

  void main() {
    if (vReveal < 0.01) discard;
    vec2 p = abs(vUv - 0.5);
    // A rounded rectangle: the parked car's footprint seen from above.
    float body = 1.0 - smoothstep(0.34, 0.46, max(p.x, p.y * 1.6));
    if (body < 0.01) discard;
    // The roof/cabin — a slightly brighter inset band so the rectangle reads as
    // a car, not a slab.
    float roof = (1.0 - smoothstep(0.16, 0.28, p.x)) * (1.0 - smoothstep(0.1, 0.2, p.y));
    vec3 col = carHue(fract(vSeed * 0.61));
    col = mix(col, min(col * 1.35, vec3(0.9)), roof * 0.5);
    float a = body * uOpacity * vReveal * (1.0 - fogFactor());
    if (a < 0.004) discard;
    gl_FragColor = vec4(mix(col, uFog, fogFactor()), a);
  }
`;

// --- deterministic layout ----------------------------------------------------

// Deterministic 0..1 hash — no Math.random, so the deck lays out the same way
// every reload (the whole scene's determinism rule).
function hash(n: number): number {
  return Math.abs((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1);
}

interface PassSlot {
  vi: number; // which vessel
  lx: number; // boat-local position (unit-boat coords; ×toyLength → world)
  ly: number;
  lz: number;
  size: number; // world-unit figure height
  seed: number;
  bow: number;
}
interface CarSlot {
  vi: number;
  lx: number;
  ly: number;
  lz: number;
  len: number; // world-unit rectangle size
  wid: number;
  seed: number;
}

const D = CONFIG.ferryDeck;

/** A car ferry carries vehicles; the little water taxi does not. */
function isCarFerry(v: (typeof FERRY_VESSELS)[number]): boolean {
  return v.toyLengthKm > 0.15;
}

function buildLayout(): { pass: PassSlot[]; cars: CarSlot[] } {
  const pass: PassSlot[] = [];
  const cars: CarSlot[] = [];
  for (let vi = 0; vi < FERRY_VESSELS.length; vi++) {
    const v = FERRY_VESSELS[vi];
    const carFerry = isCarFerry(v);
    // The water taxi is a smaller, passenger-only boat — a lighter crowd.
    const nPass = carFerry ? PROFILE.ferryPassengers : Math.max(3, Math.round(PROFILE.ferryPassengers * 0.6));
    const size = D.passengerHeight * v.toyLengthKm;
    for (let p = 0; p < nPass; p++) {
      const seed = hash(vi * 3.1 + p * 1.9);
      if (p === 0) {
        // One figure always at the bow, watching the crossing.
        pass.push({ vi, lx: D.bowX, ly: D.bowY, lz: 0, size, seed, bow: 1 });
        continue;
      }
      // The rest line the promenade rail, alternating port and starboard, spread
      // fore-and-aft along the deck.
      const idx = p - 1;
      const side = idx % 2 === 0 ? 1 : -1;
      const rows = Math.max(1, Math.ceil((nPass - 1) / 2));
      const t = (Math.floor(idx / 2) + 0.5) / rows;
      const lx = D.railX[0] + (D.railX[1] - D.railX[0]) * t;
      const jitter = (hash(vi * 5.7 + p * 2.3) - 0.5) * 0.02;
      pass.push({ vi, lx: lx + jitter, ly: D.promenadeY, lz: D.railZ * side, size, seed, bow: 0 });
    }
    if (!carFerry) continue;
    // The car deck below: two parked lanes running fore-and-aft.
    const nCars = PROFILE.ferryCars;
    const len = D.carSize.len * v.toyLengthKm;
    const wid = D.carSize.wid * v.toyLengthKm;
    for (let c = 0; c < nCars; c++) {
      const lane = c % 2 === 0 ? 1 : -1;
      const rows = Math.max(1, Math.ceil(nCars / 2));
      const t = (Math.floor(c / 2) + 0.5) / rows;
      const lx = D.carSpanX[0] + (D.carSpanX[1] - D.carSpanX[0]) * t;
      cars.push({ vi, lx, ly: D.carDeckY, lz: D.carLaneZ * lane, len, wid, seed: hash(vi * 8.3 + c * 4.4) });
    }
  }
  return { pass, cars };
}

// --- component ---------------------------------------------------------------

const matrix = new THREE.Matrix4();
const scaleV = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
// Per-vessel scratch, reused each frame so the hot path never allocates.
const pose: VesselPose = { x: 0, z: 0, yaw: 0, speed: 0 };
const local = new THREE.Vector3();
const quats: THREE.Quaternion[] = FERRY_VESSELS.map(() => new THREE.Quaternion());
const poseX = new Float32Array(FERRY_VESSELS.length);
const poseZ = new Float32Array(FERRY_VESSELS.length);
const reveal = new Float32Array(FERRY_VESSELS.length);

export function FerryDeck() {
  const passRef = useRef<THREE.InstancedMesh>(null);
  const carRef = useRef<THREE.InstancedMesh>(null);
  const camera = useThree((s) => s.camera);

  const { pass, cars, passGeo, carGeo, passReveal, carReveal } = useMemo(() => {
    const { pass, cars } = buildLayout();

    const passGeo = new THREE.PlaneGeometry(1, 1);
    const seed = new Float32Array(pass.length);
    const psize = new Float32Array(pass.length);
    const bow = new Float32Array(pass.length);
    const passReveal = new Float32Array(pass.length);
    pass.forEach((s, i) => {
      seed[i] = s.seed;
      psize[i] = s.size;
      bow[i] = s.bow;
    });
    passGeo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
    passGeo.setAttribute("aSize", new THREE.InstancedBufferAttribute(psize, 1));
    passGeo.setAttribute("aBow", new THREE.InstancedBufferAttribute(bow, 1));
    const passRevAttr = new THREE.InstancedBufferAttribute(passReveal, 1);
    passRevAttr.setUsage(THREE.DynamicDrawUsage);
    passGeo.setAttribute("aReveal", passRevAttr);

    // A flat unit quad lying in the XZ plane (car roofs seen from above).
    const carGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const cseed = new Float32Array(cars.length);
    const carReveal = new Float32Array(cars.length);
    cars.forEach((s, i) => (cseed[i] = s.seed));
    carGeo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(cseed, 1));
    const carRevAttr = new THREE.InstancedBufferAttribute(carReveal, 1);
    carRevAttr.setUsage(THREE.DynamicDrawUsage);
    carGeo.setAttribute("aReveal", carRevAttr);

    return { pass, cars, passGeo, carGeo, passReveal, carReveal };
  }, []);

  useFrame(() => {
    const passMesh = passRef.current;
    const carMesh = carRef.current; // may be absent if a tier carries no cars
    if (!passMesh) return;

    // Per-vessel: live pose, heading, and camera-distance reveal. Each boat
    // reveals on its OWN distance, so zooming onto one doesn't wake the others.
    let nearest = Infinity;
    for (let vi = 0; vi < FERRY_VESSELS.length; vi++) {
      ferryPoseAt(FERRY_VESSELS[vi], CLOCK.t, pose);
      poseX[vi] = pose.x;
      poseZ[vi] = pose.z;
      quats[vi].setFromAxisAngle(UP, pose.yaw);
      const toy = FERRY_VESSELS[vi].toyLengthKm;
      const dx = camera.position.x - pose.x;
      const dy = camera.position.y - D.promenadeY * toy;
      const dz = camera.position.z - pose.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      nearest = Math.min(nearest, dist);
      reveal[vi] = 1 - THREE.MathUtils.smoothstep(dist, D.revealNearKm, D.revealFarKm);
    }

    // Off stage: the boats are tokens again — hide the whole layer, cost nothing.
    if (nearest > D.revealFarKm) {
      passMesh.visible = false;
      if (carMesh) carMesh.visible = false;
      return;
    }
    passMesh.visible = true;
    if (carMesh) carMesh.visible = true;

    // Passengers: place each figure at its boat-local point rotated into world.
    for (let k = 0; k < pass.length; k++) {
      const s = pass[k];
      const toy = FERRY_VESSELS[s.vi].toyLengthKm;
      local.set(s.lx * toy, s.ly * toy, s.lz * toy).applyQuaternion(quats[s.vi]);
      matrix.makeTranslation(poseX[s.vi] + local.x, local.y, poseZ[s.vi] + local.z);
      passMesh.setMatrixAt(k, matrix);
      passReveal[k] = reveal[s.vi];
    }
    passMesh.instanceMatrix.needsUpdate = true;
    (passGeo.getAttribute("aReveal") as THREE.InstancedBufferAttribute).needsUpdate = true;

    // Cars: full transform (they lie flat and turn with the hull).
    if (carMesh) for (let k = 0; k < cars.length; k++) {
      const s = cars[k];
      const toy = FERRY_VESSELS[s.vi].toyLengthKm;
      local.set(s.lx * toy, s.ly * toy, s.lz * toy).applyQuaternion(quats[s.vi]);
      matrix.compose(
        local.set(poseX[s.vi] + local.x, local.y, poseZ[s.vi] + local.z),
        quats[s.vi],
        scaleV.set(s.len, 1, s.wid)
      );
      carMesh.setMatrixAt(k, matrix);
      carReveal[k] = reveal[s.vi];
    }
    if (carMesh) {
      carMesh.instanceMatrix.needsUpdate = true;
      (carGeo.getAttribute("aReveal") as THREE.InstancedBufferAttribute).needsUpdate = true;
      const cm = carMesh.material as THREE.ShaderMaterial;
      cm.uniforms.uOpacity.value = LIVE.ferryOpacity;
      cm.uniforms.uFogDensity.value = LIVE.fogDensity;
    }

    const pm = passMesh.material as THREE.ShaderMaterial;
    pm.uniforms.uTime.value = CLOCK.t;
    pm.uniforms.uCold.value = COLD.level;
    pm.uniforms.uOpacity.value = LIVE.ferryOpacity;
    pm.uniforms.uFogDensity.value = LIVE.fogDensity;
  });

  if (pass.length === 0) return null;

  return (
    <>
      <instancedMesh
        ref={passRef}
        args={[undefined, undefined, pass.length]}
        geometry={passGeo}
        renderOrder={6.2}
        frustumCulled={false}
      >
        <shaderMaterial
          vertexShader={PASS_VERT}
          fragmentShader={PASS_FRAG}
          uniforms={{
            uWarm: { value: LIVE.station }, // palette-by-reference: persimmon by day, amber by night
            uCoat: { value: new THREE.Color("#2f4d78") }, // ai-blue coat
            uBreath: { value: new THREE.Color("#eceef2") }, // cool paper-vapor
            uOpacity: { value: 0.9 },
            uCold: { value: 0 },
            uTime: { value: 0 },
            uFog: { value: LIVE.fog },
            uFogDensity: { value: LIVE.fogDensity },
          }}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
      {cars.length > 0 && (
        <instancedMesh
          ref={carRef}
          args={[undefined, undefined, cars.length]}
          geometry={carGeo}
          renderOrder={6.1}
          frustumCulled={false}
        >
          <shaderMaterial
            vertexShader={CAR_VERT}
            fragmentShader={CAR_FRAG}
            uniforms={{
              uOpacity: { value: 0.9 },
              uFog: { value: LIVE.fog },
              uFogDensity: { value: LIVE.fogDensity },
            }}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </instancedMesh>
      )}
    </>
  );
}
