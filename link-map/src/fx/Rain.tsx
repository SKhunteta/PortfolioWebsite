// Falling rain, drawn on the glass: a single clip-space triangle over the
// whole frame, faint slanted streaks in the label blue, only when it is
// actually raining in Seattle (world/weather.ts — the eased real
// observation, or the ?rain= override). The pass is skipped entirely while
// dry (visible = false), and phones never mount it (PROFILE.rainStreaks).
//
// renderOrder 12: over the labels, like weather on the window between you
// and the diorama. Deterministic from the one clock.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { WEATHER } from "../world/weather";
import { PROFILE } from "../world/device";

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uRain;
  uniform float uBreath;
  uniform float uAspect;
  uniform vec3 uColor;
  float rHash(float n) { return fract(sin(n * 127.1) * 43758.5453123); }
  void main() {
    // Wind-slanted column space; each column is one potential streak.
    vec2 p = vec2(vUv.x * uAspect + vUv.y * 0.14, vUv.y);
    float colX = p.x * 90.0;
    float col = floor(colX);
    float h = rHash(col);
    // Columns join in as the rain deepens — drizzle is a few threads,
    // a downpour fills the frame. ("active" is reserved in GLSL ES.)
    float falling = step(h, uRain * 0.8);
    float speed = 1.1 + 0.7 * rHash(col + 61.0);
    float y = fract(p.y * (1.3 + 0.5 * rHash(col + 41.0)) + uTime * speed + h * 7.0);
    float dash = smoothstep(0.0, 0.05, y) * (1.0 - smoothstep(0.09, 0.22, y));
    float x = fract(colX);
    float thread = smoothstep(0.12, 0.4, x) * (1.0 - smoothstep(0.6, 0.88, x));
    // Gusts ride the global breath.
    float a = falling * dash * thread * uRain * (0.75 + 0.25 * uBreath) * 0.22;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

export function Rain() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // One triangle covering clip space — no matrices, no culling.
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)
    );
    return g;
  }, []);

  useFrame(({ size }) => {
    const mesh = meshRef.current;
    const m = materialRef.current;
    if (!mesh || !m) return;
    const raining = WEATHER.rain > 0.01;
    mesh.visible = raining;
    if (!raining) return;
    m.uniforms.uTime.value = CLOCK.t;
    m.uniforms.uRain.value = WEATHER.rain;
    m.uniforms.uBreath.value = CLOCK.breath;
    m.uniforms.uAspect.value = size.width / Math.max(1, size.height);
  });

  if (!PROFILE.rainStreaks) return null;

  return (
    <mesh ref={meshRef} geometry={geometry} renderOrder={12} frustumCulled={false} visible={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uTime: { value: 0 },
          uRain: { value: 0 },
          uBreath: { value: 0 },
          uAspect: { value: 16 / 9 },
          uColor: { value: LIVE.label }, // palette-by-reference
        }}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
