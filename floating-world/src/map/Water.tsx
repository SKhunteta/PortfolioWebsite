// Water as woodblock pigment: a noise-blotched Prussian-blue fill plus a
// deeper pigment-pooling stroke ribboned along every shoreline, both wobbled
// by the SAME world-position noise so they breathe together (~20 s, 30 m —
// subliminal).
//
// The traditional seigaiha wave-fan pattern is the DAYTIME signature here —
// foam-white linework woven over the ai-blue like the Great Wave, surfacing
// on the global breath; after dark it thins to gold thread by lantern light
// (palette seigaiha/seigaihaIntensity carry the change). It's a pure shader
// pattern in world space, so it stays calm under the drifting camera.
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

// Seigaiha: staggered rows of unit circles (x pitch 2, y pitch 0.5, odd rows
// shifted half a pitch); the frontmost (lowest-row) circle containing the
// point owns it, which carves every circle into the traditional overlapping
// fan. Returns the concentric-arc line mask. AA width comes from fwidth of
// the smooth pattern coords, NOT of d — d crosses fan boundaries where
// derivatives of branched values are undefined.
const SEIGAIHA_GLSL = /* glsl */ `
  #define SEIGAIHA_RINGS ${CONFIG.basemap.seigaihaRings.toFixed(1)}
  float seigaiha(vec2 p) {
    float aa = (fwidth(p.x) + fwidth(p.y)) * SEIGAIHA_RINGS * 0.5;
    float jFront = ceil((p.y - 1.0) * 2.0); // first row whose circles reach p
    float d = 2.0;
    for (int k = 0; k < 5; k++) {
      float j = jFront + float(k);
      float off = mod(j, 2.0);
      float cx = floor((p.x - off) * 0.5 + 0.5) * 2.0 + off;
      float dd = length(p - vec2(cx, j * 0.5));
      if (dd < 1.0) { d = dd; break; }
    }
    if (d > 1.0) return 0.0;
    float rd = d * SEIGAIHA_RINGS;
    float toLine = abs(fract(rd + 0.5) - 0.5);
    return 1.0 - smoothstep(0.12, 0.12 + aa, toLine);
  }
`;

const FILL_FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  ${SEIGAIHA_GLSL}
  uniform vec3 uWater;
  uniform vec3 uSeigaiha;
  uniform float uSeigaihaIntensity;
  uniform float uOpacity;
  uniform float uBreath;
  uniform float uTime;
  void main() {
    float blotch = 0.80 + 0.35 * wcFbm(vWorld * 0.6);
    vec3 water = uWater;
    if (uSeigaihaIntensity > 0.001) {
      // Pattern y points north (-z) so the fans open toward the mountains.
      float fan = seigaiha(vec2(vWorld.x, -vWorld.y) / ${CONFIG.basemap.seigaihaRadiusKm.toFixed(3)});
      // Uneven like a weave: broad slow-drifting patches gate the pattern,
      // and the global breath surfaces then submerges it (~9 s).
      float silk = smoothstep(0.42, 0.72, wcNoise(vWorld * 0.08 + vec2(uTime * 0.008, -uTime * 0.006)));
      water = mix(water, uSeigaiha, fan * silk * uBreath * uSeigaihaIntensity);
    }
    vec3 c = mix(water, uFog, fogFactor());
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
    // Normal-blended pigment (mix toward fog per the raw-ShaderMaterial
    // contract): literal blue pooling along the shoreline, able to darken
    // the bright paper it meets.
    vec3 c = mix(uColor, uFog, fogFactor());
    gl_FragColor = vec4(c, core * pool * uIntensity);
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

// The over-print: how much of the water's pigment is stamped a SECOND time
// ABOVE the translucent paper (renderOrder 4.5). Without it the bright washi
// ground veils the fill (order 1) and Prussian blue greys out; printing the
// blue block over the sheet is also exactly how a real woodblock lays color.
// The under-layer stays put so tunnels crossing beneath water still read.
const OVERPRINT = 0.62;

export function Water() {
  const fillRef = useRef<THREE.ShaderMaterial>(null);
  const overRef = useRef<THREE.ShaderMaterial>(null);
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
      fillRef.current.uniforms.uOpacity.value = LIVE.waterOpacity;
      fillRef.current.uniforms.uSeigaihaIntensity.value = LIVE.seigaihaIntensity;
    }
    if (overRef.current) {
      overRef.current.uniforms.uTime.value = CLOCK.t;
      overRef.current.uniforms.uBreath.value = CLOCK.breath;
      overRef.current.uniforms.uFogDensity.value = LIVE.fogDensity;
      overRef.current.uniforms.uOpacity.value = LIVE.waterOpacity * OVERPRINT;
      overRef.current.uniforms.uSeigaihaIntensity.value = LIVE.seigaihaIntensity;
    }
    if (edgeRef.current) {
      edgeRef.current.uniforms.uTime.value = CLOCK.t;
      edgeRef.current.uniforms.uIntensity.value = LIVE.waterEdgeIntensity;
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
            uSeigaiha: { value: LIVE.seigaiha },
            uSeigaihaIntensity: { value: LIVE.seigaihaIntensity },
            uFog: { value: LIVE.fog },
            uFogDensity: { value: LIVE.fogDensity },
            uOpacity: { value: LIVE.waterOpacity },
            uBreath: { value: 0 },
            ...wobbleUniforms(),
          }}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Over-print pass: the same blue block stamped above the paper. */}
      <mesh
        geometry={fillGeometry}
        rotation-x={-Math.PI / 2}
        position-y={CONFIG.basemap.waterY}
        renderOrder={4.5}
        frustumCulled={false}
      >
        <shaderMaterial
          ref={overRef}
          vertexShader={FILL_VERT}
          fragmentShader={FILL_FRAG}
          uniforms={{
            uWater: { value: LIVE.water },
            uSeigaiha: { value: LIVE.seigaiha },
            uSeigaihaIntensity: { value: LIVE.seigaihaIntensity },
            uFog: { value: LIVE.fog },
            uFogDensity: { value: LIVE.fogDensity },
            uOpacity: { value: LIVE.waterOpacity * OVERPRINT },
            uBreath: { value: 0 },
            ...wobbleUniforms(),
          }}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Shoreline pooling prints over the paper too (4.6), crisp — not
          veiled under it like link-map's night edge was. */}
      <mesh geometry={edgeGeometry} renderOrder={4.6} frustumCulled={false}>
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
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
