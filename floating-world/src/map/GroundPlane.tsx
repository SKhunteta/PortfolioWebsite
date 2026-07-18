// The translucent ground, now painted like paper: broad watercolor washes,
// pigment mottling, and fine tooth, all in-fragment from world position.
// Tunnel ribbons still render BENEATH it and are seen through it — that
// submerged read is painter's order, not the depth buffer.
//
// Render-order contract (everything transparent + depthWrite:false, EXCEPT
// the train model at 9 which is the one depthWrite:true exception so its
// sections self-occlude):
//   −1 sky bokashi (screen-space wipe, under everything) · 0 parks
//   (under-wash, y −0.08) · 1 water fill under-layer (−0.06) · 2.8 tunnel
//   trench walls (TunnelWalls.tsx) · 2.9 underground hall floors + ring
//   walls (HallShells.tsx) · 3 tunnel
//   ribbons (−0.22) + underground station orbs, their light shafts, and the
//   deep-platform crowd + art frescoes (UndergroundLife.tsx) ·
//   4 ground/paper (0) · 4.5 water over-print (the blue block stamped above
//   the sheet — see Water.tsx) · 4.6 water edge stroke (−0.05) · 4.65 water
//   reflections (trains/ferries/city lights — Reflections.tsx) · 4.7 foam wake
//   (Wakes.tsx) · 5 roads
//   (0.010/0.014) · 5.6 forest (billboarded conifers) · 6 surface + elevated
//   ribbons, landmarks, ferries · 6.2 building fabric (the
//   woodblock town — FIVE instanced variant meshes, one per silhouette,
//   sharing one uniforms object) · 6.3 seaplanes + airliners (above the town — they fly
//   OVER it) · 6.5 kasumi mist bands (y 0.5) · 7 stations (surface/elevated
//   orbs + hanko seals) · 8 trails · 9 train model (depthWrite:true) ·
//   10 glow sprites + headlights + city lights (Needle beacon, stadium
//   domes) · 10.5 weather hatch (screen-space rain/snow) · 11 labels
//   (depthTest off)

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LIVE } from "../world/palettes";
import { WEATHER } from "../world/weather";
import { CLOCK } from "../world/clock";
import { PROFILE } from "../world/device";
import { CENTROID, projectLatLng } from "./network";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

// Seattle's seven hills, at their real centers with a relative prominence
// weight. The ground shader sums a soft gaussian bump at each and lights the
// result from the northwest (the landmark key light), so the flat sheet gains
// a stylized topographic relief — the city reads HILLY without any 3D geometry.
// Like kasumi and the seigaiha wave-fans it's stylized paint, not a data
// readout: it prints no elevation and can't lie about a height.
const HILL_LATLNG: [number, number, number][] = [
  [47.637, -122.357, 1.0], // Queen Anne — the high one
  [47.625, -122.32, 0.9], // Capitol Hill
  [47.609, -122.325, 0.7], // First Hill
  [47.579, -122.311, 0.85], // Beacon Hill
  [47.65, -122.4, 0.8], // Magnolia bluff
  [47.581, -122.387, 0.9], // West Seattle / Admiral
  [47.668, -122.355, 0.7], // Phinney Ridge / Crown Hill
];
const HILLS = HILL_LATLNG.map(([lat, lng, w]) => {
  const { x, z } = projectLatLng(lat, lng);
  return new THREE.Vector3(x, z, w * 0.12); // z-component carries the bump weight (km)
});

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  #define NHILLS ${HILLS.length}
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  uniform vec3 uGround;
  uniform vec3 uPaperTint;
  uniform float uGrain;
  uniform float uOpacity;
  uniform float uRain; // eased live weather (world/weather.ts)
  uniform float uTime;
  uniform vec3 uHills[NHILLS]; // xy = world center, z = bump weight (km)
  uniform float uHillR2;       // gaussian radius², km²
  uniform float uHillK;        // gradient → normal steepness
  uniform float uHillStrength; // shading amount (a wash, stays subtle)
  void main() {
    // Living paper: the wash and the tooth drift sub-perceptually on the
    // already-bound clock — the sheet itself breathes, never fast enough to
    // read as motion, always alive on a long stare. Zero extra samples.
    float wash   = wcFbm(vWorld * 0.11 + 31.7 + uTime * 0.004); // ~9 km washes
    float grain  = wcFbm(vWorld * 2.6);                         // pigment mottling
    float fibers = wcNoise(vWorld * 24.0 + vec2(uTime * 0.012, 0.0)); // paper tooth
    vec3 c = uGround + uPaperTint * (wash - 0.5);
    c *= 1.0 + uGrain * (grain - 0.5) + uGrain * 0.6 * (fibers - 0.5);
    // Rain on the page: a slow-crawling wet mottle — patches of the wash
    // darken where the paper has drunk the water. One extra noise sample,
    // and it costs nothing on a dry day (uRain eases back to 0).
    float wet = wcNoise(vWorld * 5.0 + vec2(0.0, uTime * 0.28));
    c *= 1.0 - uRain * 0.2 * smoothstep(0.55, 0.95, wet);
    // The seven hills: gradient of a sum-of-gaussians heightfield gives a
    // surface normal, lit from the NW like the landmark massing. NW-facing
    // slopes catch the light, SE slopes fall into shadow — relief around the
    // flat baseline (dot of straight-up with the light ≈ 0.85).
    vec2 grad = vec2(0.0);
    for (int i = 0; i < NHILLS; i++) {
      vec2 d = vWorld - uHills[i].xy;
      float e = uHills[i].z * exp(-dot(d, d) / uHillR2);
      grad += (-2.0 / uHillR2) * d * e;
    }
    vec3 nrm = normalize(vec3(-uHillK * grad.x, 1.0, -uHillK * grad.y));
    float shade = dot(nrm, normalize(vec3(-0.5, 0.85, -0.45))) - 0.85;
    c *= 1.0 + uHillStrength * shade;
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), uOpacity);
  }
`;

export function GroundPlane() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(() => {
    const m = materialRef.current;
    if (!m) return;
    m.uniforms.uOpacity.value = Math.min(1, LIVE.groundOpacity * PROFILE.washBoost);
    m.uniforms.uFogDensity.value = LIVE.fogDensity;
    m.uniforms.uGrain.value = LIVE.paperGrain;
    m.uniforms.uRain.value = WEATHER.rain;
    m.uniforms.uTime.value = CLOCK.t;
  });

  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[CENTROID.x, 0, CENTROID.z]}
      renderOrder={4}
      frustumCulled={false}
    >
      <planeGeometry args={[400, 400]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uGround: { value: LIVE.ground }, // palette-by-reference
          uPaperTint: { value: LIVE.paperTint },
          uFog: { value: LIVE.fog },
          uFogDensity: { value: LIVE.fogDensity },
          uGrain: { value: LIVE.paperGrain },
          uOpacity: { value: LIVE.groundOpacity },
          uRain: { value: 0 },
          uTime: { value: 0 },
          uHills: { value: HILLS },
          uHillR2: { value: 1.69 }, // ~1.3 km hill radius
          uHillK: { value: 6.0 },
          uHillStrength: { value: 0.14 }, // subtle — a relief wash, not a bevel
        }}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
