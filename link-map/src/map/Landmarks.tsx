// Hand-inked landmarks: the handful of silhouettes that make the diagram
// unmistakably Seattle — downtown's massed towers, the Space Needle, the
// SODO stadiums, UW's campus, SeaTac's runways, and Mount Rainier ghosted
// on the southeast horizon. Toy-scaled like the trains (~4–5× real height,
// the storybook register), merged into ONE geometry / ONE draw call, and
// painted with the same watercolor wash + fog contract as every other
// normal-blended layer. depthWrite stays false (the train model remains the
// scene's only depth writer); soft self-overlap reads as pooled pigment.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { projectLatLng } from "./network";
import { LIVE } from "../world/palettes";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  varying float vY;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vY = world.y;
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying float vY;
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    float wash = wcFbm(vWorld * 0.8 + vY * 2.1); // pigment mottle per face
    vec3 c = uColor * (0.75 + 0.5 * wash);
    // Watercolor pools at the base; the page shows through near the top.
    c *= mix(1.12, 0.85, smoothstep(0.0, 0.9, vY));
    // Snowline — only Rainier climbs past ~1.6 km, so the cap goes pale.
    c = mix(c, vec3(0.62, 0.7, 0.8), smoothstep(1.6, 3.6, vY) * 0.85);
    float a = uOpacity * (0.85 + 0.3 * wash);
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), a);
  }
`;

/** A footprint-anchored box: base sits on the paper at (lat, lng). */
function tower(lat: number, lng: number, w: number, h: number, d: number, yaw = 0) {
  const { x, z } = projectLatLng(lat, lng);
  const geo = new THREE.BoxGeometry(w, h, d);
  if (yaw) geo.rotateY(yaw);
  geo.translate(x, h / 2, z);
  return geo;
}

function buildGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // --- downtown massing (heights ~5-6x real, footprints widened past
  //     real proportions — a building's footprint faces the camera
  //     edge-on from most drift angles, so it needs to be a fatter
  //     target than a real floor plate to survive ~20-47 m/px sampling) ---
  parts.push(tower(47.6045, -122.3305, 0.36, 1.5, 0.36)); // Columbia Center
  parts.push(tower(47.6106, -122.3348, 0.28, 1.3, 0.28)); // Rainier Square
  parts.push(tower(47.6082, -122.3369, 0.3, 1.18, 0.3)); // 1201 Third
  parts.push(tower(47.6103, -122.332, 0.26, 1.1, 0.26)); // Two Union Sq
  parts.push(tower(47.6067, -122.3327, 0.26, 1.02, 0.26)); // F5 Tower
  parts.push(tower(47.6046, -122.3294, 0.24, 0.96, 0.24)); // Municipal Tower
  parts.push(tower(47.6019, -122.3318, 0.16, 0.72, 0.16)); // Smith Tower
  parts.push(tower(47.6128, -122.3382, 0.28, 0.78, 0.28)); // Westin-ish
  parts.push(tower(47.6089, -122.3298, 0.24, 0.68, 0.24)); // mid-rise fill
  parts.push(tower(47.6141, -122.3345, 0.24, 0.6, 0.24)); // Denny Triangle fill

  // --- Space Needle: tapered shaft, saucer, spire — radii nearly doubled
  //     from a first pass that was true-toy-scale but read as a hairline
  //     at drift distance; this is the piece's single named landmark, it
  //     has to survive being small on screen ---
  {
    const { x, z } = projectLatLng(47.6205, -122.3493);
    const shaft = new THREE.CylinderGeometry(0.05, 0.09, 0.75, 8);
    shaft.translate(x, 0.375, z);
    const saucer = new THREE.CylinderGeometry(0.17, 0.26, 0.12, 10);
    saucer.translate(x, 0.79, z);
    const spire = new THREE.ConeGeometry(0.024, 0.22, 6);
    spire.translate(x, 0.96, z);
    parts.push(shaft, saucer, spire);
  }

  // --- SODO stadiums: two long low halls beside the tracks ---
  parts.push(tower(47.5952, -122.3316, 0.34, 0.2, 0.5)); // Lumen Field
  parts.push(tower(47.5914, -122.3325, 0.42, 0.16, 0.42)); // T-Mobile Park

  // --- UW: a slim collegiate tower and two low halls by the station ---
  parts.push(tower(47.6545, -122.3095, 0.09, 0.5, 0.09)); // Gerberding tower
  parts.push(tower(47.6553, -122.308, 0.28, 0.2, 0.14, 0.5)); // halls
  parts.push(tower(47.6537, -122.3078, 0.22, 0.16, 0.12, -0.4));

  // --- SeaTac: the paired runways (flat inked strokes) + control tower ---
  parts.push(tower(47.44, -122.3116, 0.06, 0.012, 3.0)); // 16L/34R
  parts.push(tower(47.44, -122.3054, 0.06, 0.012, 3.0)); // 16C/34C
  parts.push(tower(47.4416, -122.3116, 0.05, 0.3, 0.05)); // tower

  // --- Mount Rainier, ~85 km southeast: real scale IS the storybook scale.
  //     Mostly fog at drift distance — a pale presence, not a prop.
  {
    const { x, z } = projectLatLng(46.8523, -121.7603);
    const cone = new THREE.ConeGeometry(9, 4.4, 9);
    cone.translate(x, 2.2, z);
    parts.push(cone);
  }

  const merged = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  return merged;
}

export function Landmarks() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(buildGeometry, []);

  useFrame(() => {
    const m = materialRef.current;
    if (!m) return;
    m.uniforms.uOpacity.value = LIVE.landmarkOpacity;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;
  });

  return (
    <mesh geometry={geometry} renderOrder={6} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uColor: { value: LIVE.landmark }, // palette-by-reference
          uOpacity: { value: LIVE.landmarkOpacity },
          uFog: { value: LIVE.fog },
          uFogDensity: { value: LIVE.fogDensity },
        }}
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}
