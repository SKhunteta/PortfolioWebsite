// The wash-shadow layer: ONE InstancedMesh of soft pigment blots drawn under
// the paper (renderOrder 3, beneath the ground at 4 and seen through it, like
// the tunnels). It owns no positions of its own — it drains the shadow queue
// (world/shadows.ts) that the trains, ferries, seaplanes and landmarks fill
// each frame, writes their matrices, then clears the queue. Mounted AFTER
// every caster so the queue is full by the time this useFrame runs.
//
// Normal-blended dark pigment (it darkens the wash beneath, not adds light),
// so it mixes toward the fog itself at drift distance like every other
// normal-blended layer, and depthWrite stays false.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LIVE } from "../world/palettes";
import { sunPhase } from "../world/sun";
import { SHADOWS, MAX_SHADOWS, resetShadows } from "../world/shadows";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

const SHADOW_Y = -0.02; // just under the paper, above the water fill

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aStrength;
  varying vec2 vLocal;
  varying float vStrength;
  void main() {
    vLocal = position.xy;
    vStrength = aStrength;
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
  uniform vec3 uShadow;
  uniform float uOpacity;
  varying vec2 vLocal;
  varying float vStrength;
  void main() {
    float r = length(vLocal);
    // A soft blurred blot: darkest at the centre, feathered to nothing at the
    // rim so it never reads as a hard disc.
    float body = 1.0 - smoothstep(0.12, 1.0, r);
    body *= body;
    // A little world-space grain so it dries like a wash, not an airbrush.
    float grain = 0.85 + 0.3 * wcNoise(vWorld * 3.0);
    float a = body * vStrength * uOpacity * grain;
    vec3 c = mix(uShadow, uFog, fogFactor());
    gl_FragColor = vec4(c, a);
  }
`;

const matrix = new THREE.Matrix4();
const SHADOW_QUAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
const SHADOW_POS = new THREE.Vector3();
const SHADOW_SCALE = new THREE.Vector3();

export function Shadows() {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const { strengthAttr } = useMemo(() => {
    const strengthAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_SHADOWS), 1);
    strengthAttr.setUsage(THREE.DynamicDrawUsage);
    return { strengthAttr };
  }, []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const strengths = strengthAttr.array as Float32Array;
    const n = Math.min(SHADOWS.count, MAX_SHADOWS);
    for (let i = 0; i < n; i++) {
      const rad = SHADOWS.radius[i];
      SHADOW_POS.set(SHADOWS.x[i], SHADOW_Y, SHADOWS.z[i]);
      SHADOW_SCALE.set(rad, rad, rad);
      matrix.compose(SHADOW_POS, SHADOW_QUAT, SHADOW_SCALE);
      mesh.setMatrixAt(i, matrix);
      strengths[i] = SHADOWS.strength[i];
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    strengthAttr.needsUpdate = true;

    const mat = mesh.material as THREE.ShaderMaterial;
    mat.uniforms.uFogDensity.value = LIVE.fogDensity;
    // Pushed high because the shadow is seen THROUGH the ~80%-opaque paper
    // (renderOrder 3, under the ground at 4) — most of it is dimmed away, so
    // the queued strength has to survive that. A touch lighter by day, when
    // the whole page is pale and a hard shade would read wrong.
    mat.uniforms.uOpacity.value = 1.15 - 0.45 * sunPhase();

    resetShadows(); // drained — the casters refill it next frame
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_SHADOWS]}
      renderOrder={3}
      frustumCulled={false}
    >
      <circleGeometry args={[1, 20]}>
        <primitive object={strengthAttr} attach="attributes-aStrength" />
      </circleGeometry>
      <shaderMaterial
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uShadow: { value: new THREE.Color(0.015, 0.02, 0.04) },
          uOpacity: { value: 0.4 },
          uFog: { value: LIVE.fog }, // palette-by-reference
          uFogDensity: { value: LIVE.fogDensity },
        }}
        transparent
        depthWrite={false}
      />
    </instancedMesh>
  );
}
