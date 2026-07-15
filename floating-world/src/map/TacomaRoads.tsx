// Tacoma's road skeleton, hand-authored (the OSM bake in basemap.json only
// covers the Seattle bbox — Tacoma sits well south of it). I-5 is the real
// link: it runs north out of the Federal Way stretch of the baked Seattle
// network, down through Fife, and past the Tacoma Dome on the east side of
// downtown, continuing south toward Lakewood. A short I-705 spur peels off
// toward the city center, and Schuster Parkway traces the Commencement Bay
// waterfront north of downtown. Every polyline is kept east/north of the
// downtown building cluster in Landmarks.tsx (which sits west of roughly
// -122.436) so the strokes read as streets the buildings face, never as
// pavement cutting through a footprint. Same dry-brush ink treatment as
// Roads.tsx — normal-blended pigment, one merged geometry per class, and the
// SAME major/arterial hue split so the I-5 spine reads as one continuous
// ochre corridor from the baked Seattle network straight through to Tacoma
// (majors ride LIVE.roadMajor, arterials LIVE.road).

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { projectLatLng } from "./network";
import { buildStrip, mergeStrips } from "./ribbon";
import { LIVE } from "../world/palettes";
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
  void main() {
    float across = abs(vUv.y * 2.0 - 1.0);
    float core = pow(smoothstep(1.0, 0.0, across), 1.4);
    float dapple = 0.70 + 0.30 * wcNoise(vWorld * 3.0);
    vec3 c = mix(uRoad, uFog, fogFactor());
    gl_FragColor = vec4(c, core * dapple * uIntensity);
  }
`;

const CLASS_INTENSITY: Record<string, number> = { major: 1.0, arterial: 0.65 };

// I-5 through Tacoma: Federal Way (linking to the baked Seattle network's
// southern edge, ~lat 47.35) down through Fife, past the Tacoma Dome on its
// east side, and south toward Lakewood/JBLM.
const I5_TACOMA: [number, number][] = [
  [47.353, -122.283],
  [47.322, -122.297],
  [47.293, -122.315],
  [47.268, -122.358],
  [47.246, -122.398],
  [47.232, -122.415],
  [47.213, -122.428],
  [47.19, -122.442],
];

// The I-705 spur, peeling off I-5 toward the Dome/downtown edge — stops
// short of the building cluster (which starts around -122.436).
const I705_SPUR: [number, number][] = [
  [47.239, -122.415],
  [47.243, -122.42],
  [47.2475, -122.43],
];

// Schuster Parkway, tracing the Commencement Bay waterfront north of
// downtown and the Stadium District bluff, well clear of both.
const SCHUSTER_PKWY: [number, number][] = [
  [47.2475, -122.43],
  [47.253, -122.428],
  [47.262, -122.424],
  [47.272, -122.42],
  [47.283, -122.415],
];

export function TacomaRoads() {
  const materials = useRef<{ material: THREE.ShaderMaterial; classIntensity: number }[]>([]);

  const layers = useMemo(() => {
    const project = (line: [number, number][]) =>
      line.map(([lat, lng]) => {
        const { x, z } = projectLatLng(lat, lng);
        return [x, z] as [number, number];
      });

    const major = mergeStrips([
      buildStrip(project(I5_TACOMA), {
        widthKm: CONFIG.basemap.roadWidthKm.major,
        y: CONFIG.basemap.roadY.major,
      }),
    ]);
    const arterial = mergeStrips([
      buildStrip(project(I705_SPUR), {
        widthKm: CONFIG.basemap.roadWidthKm.arterial,
        y: CONFIG.basemap.roadY.arterial,
      }),
      buildStrip(project(SCHUSTER_PKWY), {
        widthKm: CONFIG.basemap.roadWidthKm.arterial,
        y: CONFIG.basemap.roadY.arterial,
      }),
    ]);

    return [
      { cls: "major" as const, geometry: major },
      { cls: "arterial" as const, geometry: arterial },
    ];
  }, []);

  useFrame(() => {
    for (const entry of materials.current) {
      if (!entry) continue;
      entry.material.uniforms.uIntensity.value =
        LIVE.roadIntensity * entry.classIntensity * PROFILE.washBoost;
      entry.material.uniforms.uFogDensity.value = LIVE.fogDensity;
    }
  });

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
              // Match Roads.tsx: the I-5 major rides the warm-ochre roadMajor
              // ink, the I-705/Schuster arterials the sumi road ink — one
              // continuous corridor with the baked Seattle network.
              uRoad: { value: layer.cls === "major" ? LIVE.roadMajor : LIVE.road },
              uIntensity: { value: LIVE.roadIntensity },
              uFog: { value: LIVE.fog },
              uFogDensity: { value: LIVE.fogDensity },
            }}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
