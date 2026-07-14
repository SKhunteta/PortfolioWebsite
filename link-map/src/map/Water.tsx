// Water as watercolor: a noise-blotched fill plus a darker pigment-pooling
// stroke ribboned along every shoreline, both wobbled by the SAME
// world-position noise so they breathe together (~20 s, 30 m — subliminal).
//
// At night the traditional seigaiha wave-fan pattern surfaces faintly in the
// fill — woven into the dark silk of the Sound, fading in on the global
// breath, gone by day (palette seigaihaIntensity lerps to 0). It's a pure
// shader pattern in world space, so it stays calm under the drifting camera.
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
import { sunPhase } from "../world/sun";
import { WEATHER, MARINE } from "../world/weather";
import { WAKES, MAX_WAKES } from "../world/wakes";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

// ?biolum forces the warm/calm gate on for demos and tests (night still
// required — bioluminescence is a night sight), like ?gamenight lights the
// stadiums.
const BIOLUM_FORCE =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).has("biolum");

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
  #define WAKE_COUNT ${MAX_WAKES}
  uniform vec3 uWater;
  uniform vec3 uSeigaiha;
  uniform float uSeigaihaIntensity;
  uniform float uOpacity;
  uniform float uBreath;
  uniform float uTime;
  uniform vec3 uWakes[WAKE_COUNT]; // xy world pos, z = strength
  uniform float uBiolum;           // warm * calm * night gate (0..1)
  uniform vec3 uBiolumColor;
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
    // Bioluminescence (#14): on warm, calm nights the Sound wakes in a faint
    // teal glow where the boats stir it — a soft bloom around each wake,
    // twinkling on a fine drifting sparkle and surfacing on the global breath.
    if (uBiolum > 0.001) {
      float glow = 0.0;
      for (int i = 0; i < WAKE_COUNT; i++) {
        float d = distance(vWorld, uWakes[i].xy);
        glow += uWakes[i].z * exp(-d * d / 0.3); // ~0.5 km bloom behind the hull
      }
      glow = min(glow, 1.2);
      float spark = smoothstep(0.5, 1.0, wcNoise(vWorld * 9.0 + vec2(uTime * 0.5, -uTime * 0.4)));
      water += uBiolumColor * uBiolum * glow * (0.35 + 0.85 * spark) * (0.6 + 0.4 * uBreath);
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
      fillRef.current.uniforms.uSeigaihaIntensity.value = LIVE.seigaihaIntensity;
      // Biolum gate (#14): warm (real temp) AND calm (not churned by rain) AND
      // night — a bloom only the dark, still, warm Sound shows. Honest: warmth
      // is 0 until a real fetch, so a blocked feed never fakes it.
      const warm = BIOLUM_FORCE ? 1 : MARINE.warmth;
      fillRef.current.uniforms.uBiolum.value = warm * (1 - WEATHER.rain) * (1 - sunPhase());
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
            uOpacity: { value: 0.62 },
            uBreath: { value: 0 },
            uWakes: { value: WAKES },
            uBiolum: { value: 0 },
            uBiolumColor: { value: new THREE.Color(0.16, 0.85, 0.7) },
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
