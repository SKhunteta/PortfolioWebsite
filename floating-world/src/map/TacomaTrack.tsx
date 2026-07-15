// The physical T Line rail: a static ink-teal ribbon under the streetcars in
// TacomaLink.tsx, so the little cars read as running ON something instead of
// gliding over bare paper. Same alignment (T_LINE_LATLNGS, hand-lifted to
// the real Tacoma Link stations), rendered once as a thin strip that hugs
// the street centerlines threading between the downtown Tacoma buildings in
// Landmarks.tsx — it never cuts across a footprint. Normal-blended pigment
// like the roads and lines (this raw ShaderMaterial mixes toward fog itself).

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { projectLatLng } from "./network";
import { T_LINE_LATLNGS } from "./TacomaLink";
import { buildStrip } from "./ribbon";
import { LIVE } from "../world/palettes";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

const VERT = /* glsl */ `
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

const FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uIntensity;
  void main() {
    float across = abs(vUv.y * 2.0 - 1.0);
    float core = pow(smoothstep(1.0, 0.0, across), 1.5);
    float dapple = 0.75 + 0.25 * wcNoise(vWorld * 4.0);
    vec3 c = mix(uColor, uFog, fogFactor());
    gl_FragColor = vec4(c, core * dapple * uIntensity);
  }
`;

export function TacomaTrack() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const pts = T_LINE_LATLNGS.map(([lat, lng]) => {
      const { x, z } = projectLatLng(lat, lng);
      return [x, z] as [number, number];
    });
    return buildStrip(pts, { widthKm: 0.03, y: 0.012 });
  }, []);

  useFrame(() => {
    const m = materialRef.current;
    if (!m) return;
    m.uniforms.uIntensity.value = LIVE.roadIntensity * 0.85;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;
  });

  return (
    <mesh geometry={geometry} renderOrder={5} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uColor: { value: LIVE.tlineWave },
          uIntensity: { value: 1 },
          uFog: { value: LIVE.fog },
          uFogDensity: { value: LIVE.fogDensity },
        }}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
