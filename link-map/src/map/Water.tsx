// Water as watercolor: a noise-blotched fill plus a darker pigment-pooling
// stroke ribboned along every shoreline, both wobbled by the SAME
// world-position noise so they breathe together (~20 s, 30 m — subliminal).
//
// Geometry comes from the baked OSM basemap (real Puget Sound, Lake
// Washington with Mercer Island, Union, Sammamish…). When basemap.json is
// still the placeholder, the hand-authored waterData.ts rings render exactly
// as before — the honest fallback.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WATER } from "./waterData";
import { projectLatLng } from "./network";
import { HAS_BASEMAP, BASEMAP_WATER, BasemapPolygon } from "./basemap";
import { buildStrip, mergeStrips } from "./ribbon";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { WEATHER } from "../world/weather";
import { CONFIG } from "../world/config";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

const WOBBLE_GLSL = /* glsl */ `
  uniform float uTime;
  uniform float uWobbleAmp;
  uniform float uWobbleFreq;
  vec2 wobble(vec2 world) {
    float nx = wcNoise(world * uWobbleFreq + uTime * 0.05);
    float nz = wcNoise(world.yx * uWobbleFreq - uTime * 0.04);
    return (vec2(nx, nz) - 0.5) * 2.0 * uWobbleAmp;
  }
`;

// Fill shape lives in XY (rotated -PI/2): local (x, y) -> world (x, -y).
const FILL_VERT = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_VERT}
  ${WOBBLE_GLSL}
  void main() {
    vec3 p = position;
    vec2 world = vec2(p.x, -p.y);
    vec2 w = wobble(world);
    p.x += w.x;
    p.y -= w.y;
    vWorld = vec2(p.x, -p.y);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FILL_FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  uniform vec3 uWater;
  uniform float uOpacity;
  uniform float uBreath;
  uniform float uRain;
  uniform float uTime; // WOBBLE_GLSL declares it for the vertex stage only
  void main() {
    float blotch = 0.80 + 0.35 * wcFbm(vWorld * 0.6);
    // Real rain stipples the surface: drifting bright flecks, scaled by the
    // eased intensity from world/weather.ts and swallowed by fog like
    // everything else on this normal-blended layer.
    float dimple = smoothstep(0.78, 0.98, wcNoise(vWorld * 7.0 + vec2(uTime * 0.9, -uTime * 0.7)));
    float fogF = fogFactor();
    vec3 c = uWater * (1.0 + 0.9 * uRain * dimple * (1.0 - fogF));
    c = mix(c, uFog, fogF);
    gl_FragColor = vec4(c, uOpacity * blotch * (0.9 + 0.1 * uBreath));
  }
`;

// Edge strokes are real XZ strips (y baked into positions).
const EDGE_VERT = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_VERT}
  ${WOBBLE_GLSL}
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    vec2 w = wobble(p.xz);
    p.x += w.x;
    p.z += w.y;
    vWorld = p.xz;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const EDGE_FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uIntensity;
  void main() {
    float across = abs(vUv.y * 2.0 - 1.0);
    float core = pow(smoothstep(1.0, 0.0, across), 1.6);
    float pool = 0.75 + 0.35 * wcNoise(vWorld * 2.2); // pigment pooling
    float fogF = 1.0 - fogFactor(); // additive: multiply, never mix
    vec3 c = uColor * uIntensity * core * pool * fogF;
    gl_FragColor = vec4(c, core);
  }
`;

function ringsToShapes(polys: BasemapPolygon[]): THREE.Shape[] {
  return polys.map((poly) => {
    const shape = new THREE.Shape();
    poly.ring.forEach(([x, z], i) => {
      if (i === 0) shape.moveTo(x, -z);
      else shape.lineTo(x, -z);
    });
    for (const hole of poly.holes) {
      const path = new THREE.Path();
      hole.forEach(([x, z], i) => {
        if (i === 0) path.moveTo(x, -z);
        else path.lineTo(x, -z);
      });
      shape.holes.push(path);
    }
    return shape;
  });
}

function fallbackPolygons(): BasemapPolygon[] {
  return WATER.map((body) => ({
    ring: body.ring.map(([lat, lng]) => {
      const { x, z } = projectLatLng(lat, lng);
      return [x, z] as [number, number];
    }),
    holes: (body.holes ?? []).map((hole) =>
      hole.map(([lat, lng]) => {
        const { x, z } = projectLatLng(lat, lng);
        return [x, z] as [number, number];
      })
    ),
  }));
}

function ringAreaKm2(ring: [number, number][]): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, z1] = ring[i];
    const [x2, z2] = ring[(i + 1) % ring.length];
    sum += x1 * -z2 - x2 * -z1;
  }
  return Math.abs(sum / 2);
}

const wobbleUniforms = () => ({
  uTime: { value: 0 },
  uWobbleAmp: { value: CONFIG.basemap.wobbleAmpKm },
  uWobbleFreq: { value: CONFIG.basemap.wobbleFreq },
});

export function Water() {
  const fillRef = useRef<THREE.ShaderMaterial>(null);
  const edgeRef = useRef<THREE.ShaderMaterial>(null);

  const { fillGeometry, edgeGeometry } = useMemo(() => {
    const polys = HAS_BASEMAP ? BASEMAP_WATER : fallbackPolygons();
    const fillGeometry = new THREE.ShapeGeometry(ringsToShapes(polys));
    const strips: THREE.BufferGeometry[] = [];
    for (const poly of polys) {
      strips.push(
        buildStrip(poly.ring, {
          widthKm: CONFIG.basemap.waterEdgeWidthKm,
          y: CONFIG.basemap.waterEdgeY,
          closed: true,
        })
      );
      for (const hole of poly.holes) {
        // Big islands (Mercer, Vashon) get shoreline strokes; slivers don't.
        if (ringAreaKm2(hole) >= CONFIG.basemap.waterEdgeMinHoleKm2) {
          strips.push(
            buildStrip(hole, {
              widthKm: CONFIG.basemap.waterEdgeWidthKm,
              y: CONFIG.basemap.waterEdgeY,
              closed: true,
            })
          );
        }
      }
    }
    const edgeGeometry = strips.length ? mergeStrips(strips) : new THREE.BufferGeometry();
    return { fillGeometry, edgeGeometry };
  }, []);

  useFrame(() => {
    if (fillRef.current) {
      fillRef.current.uniforms.uTime.value = CLOCK.t;
      fillRef.current.uniforms.uBreath.value = CLOCK.breath;
      fillRef.current.uniforms.uFogDensity.value = LIVE.fogDensity;
      fillRef.current.uniforms.uOpacity.value = 0.62;
      fillRef.current.uniforms.uRain.value = WEATHER.rain;
    }
    if (edgeRef.current) {
      edgeRef.current.uniforms.uTime.value = CLOCK.t;
      // Rain pools extra pigment along the shorelines — the stroke deepens.
      edgeRef.current.uniforms.uIntensity.value =
        LIVE.waterEdgeIntensity * (1.0 + 0.45 * WEATHER.rain);
      edgeRef.current.uniforms.uFogDensity.value = LIVE.fogDensity;
    }
  });

  return (
    <group>
      <mesh
        geometry={fillGeometry}
        rotation-x={-Math.PI / 2}
        position-y={CONFIG.basemap.waterY}
        renderOrder={1}
        frustumCulled={false}
      >
        <shaderMaterial
          ref={fillRef}
          vertexShader={FILL_VERT}
          fragmentShader={FILL_FRAG}
          uniforms={{
            uWater: { value: LIVE.water },
            uFog: { value: LIVE.fog },
            uFogDensity: { value: LIVE.fogDensity },
            uOpacity: { value: 0.62 },
            uBreath: { value: 0 },
            uRain: { value: 0 },
            ...wobbleUniforms(),
          }}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={edgeGeometry} renderOrder={2} frustumCulled={false}>
        <shaderMaterial
          ref={edgeRef}
          vertexShader={EDGE_VERT}
          fragmentShader={EDGE_FRAG}
          uniforms={{
            uColor: { value: LIVE.waterEdge },
            uIntensity: { value: LIVE.waterEdgeIntensity },
            uFog: { value: LIVE.fog },
            uFogDensity: { value: LIVE.fogDensity },
            ...wobbleUniforms(),
          }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
