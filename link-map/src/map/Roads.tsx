// The street skeleton: motorways/trunks ("major") and primary/secondary
// ("arterial") as thin hand-inked strokes — faint warm filaments at night,
// pale ink by day (one additive material handles both; the day background
// is dark slate, so low-intensity additive reads as ink, never white-out).
// All strips of a class merge into ONE geometry: two draw calls total.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HAS_BASEMAP, BASEMAP_ROADS } from "./basemap";
import { buildStrip, mergeStrips } from "./ribbon";
import { LIVE } from "../world/palettes";
import { WEATHER } from "../world/weather";
import { PROFILE } from "../world/device";
import { CONFIG } from "../world/config";
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
  uniform vec3 uRoad;
  uniform float uIntensity;
  uniform float uRain;
  void main() {
    float across = abs(vUv.y * 2.0 - 1.0);
    float core = pow(smoothstep(1.0, 0.0, across), 1.4);
    float dapple = 0.70 + 0.30 * wcNoise(vWorld * 3.0); // broken ink stroke
    // Wet glass: rain smooths the broken stroke into a continuous sheen
    // (the intensity lift rides in uIntensity from the JS side).
    dapple = mix(dapple, 0.98, 0.5 * uRain);
    float fogF = 1.0 - fogFactor(); // additive: multiply
    vec3 c = uRoad * uIntensity * core * dapple * fogF;
    gl_FragColor = vec4(c, core);
  }
`;

const CLASS_INTENSITY: Record<string, number> = { major: 1.0, arterial: 0.55 };

export function Roads() {
  const materials = useRef<{ material: THREE.ShaderMaterial; classIntensity: number }[]>([]);

  const layers = useMemo(() => {
    if (!HAS_BASEMAP) return [];
    return (["major", "arterial"] as const)
      .map((cls) => {
        const lines = BASEMAP_ROADS[cls] ?? [];
        if (!lines.length) return null;
        const strips = lines
          .filter((line) => line.length >= 2)
          .map((line) =>
            buildStrip(line as [number, number][], {
              widthKm: CONFIG.basemap.roadWidthKm[cls],
              y: CONFIG.basemap.roadY[cls],
            })
          );
        return { cls, geometry: mergeStrips(strips) };
      })
      .filter((l): l is { cls: "major" | "arterial"; geometry: THREE.BufferGeometry } => l !== null);
  }, []);

  useFrame(() => {
    for (const entry of materials.current) {
      if (!entry) continue;
      entry.material.uniforms.uIntensity.value =
        LIVE.roadIntensity * entry.classIntensity * PROFILE.washBoost * (1.0 + 0.5 * WEATHER.rain);
      entry.material.uniforms.uFogDensity.value = LIVE.fogDensity;
      entry.material.uniforms.uRain.value = WEATHER.rain;
    }
  });

  if (!layers.length) return null;

  return (
    <group>
      {layers.map((layer, i) => (
        <mesh key={layer.cls} geometry={layer.geometry} renderOrder={5} frustumCulled={false}>
          <shaderMaterial
            ref={(m: THREE.ShaderMaterial | null) => {
              if (m) materials.current[i] = { material: m, classIntensity: CLASS_INTENSITY[layer.cls] };
            }}
            vertexShader={VERT}
            fragmentShader={FRAG}
            uniforms={{
              uRoad: { value: LIVE.road },
              uIntensity: { value: LIVE.roadIntensity },
              uFog: { value: LIVE.fog },
              uFogDensity: { value: LIVE.fogDensity },
              uRain: { value: 0 },
            }}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
