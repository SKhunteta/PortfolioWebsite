// The translucent ground, now painted like paper: broad watercolor washes,
// pigment mottling, and fine tooth, all in-fragment from world position.
// Tunnel ribbons still render BENEATH it and are seen through it — that
// submerged read is painter's order, not the depth buffer.
//
// Render-order contract (everything transparent + depthWrite:false, EXCEPT
// the train model at 9 which is the one depthWrite:true exception so its
// sections self-occlude):
//   0 parks (under-wash, y −0.08) · 1 water fill (−0.06) · 2 water edge
//   stroke (−0.05) · 3 tunnel ribbons (−0.22) + underground station orbs
//   and their light shafts · 4 ground/paper (0) · 5 roads (0.010/0.014) ·
//   6 surface + elevated ribbons · 7 stations (surface/elevated orbs +
//   watercolor seals) · 8 trails · 9 train model (depthWrite:true) ·
//   10 glow sprites + headlights · 11 labels (depthTest off)

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LIVE } from "../world/palettes";
import { PROFILE } from "../world/device";
import { CENTROID } from "./network";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

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
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  uniform vec3 uGround;
  uniform vec3 uPaperTint;
  uniform float uGrain;
  uniform float uOpacity;
  void main() {
    float wash   = wcFbm(vWorld * 0.11 + 31.7); // ~9 km watercolor washes
    float grain  = wcFbm(vWorld * 2.6);         // pigment mottling
    float fibers = wcNoise(vWorld * 24.0);      // paper tooth
    vec3 c = uGround + uPaperTint * (wash - 0.5);
    c *= 1.0 + uGrain * (grain - 0.5) + uGrain * 0.6 * (fibers - 0.5);
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
        }}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
