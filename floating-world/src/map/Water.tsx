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
//
// The shoreline stroke also carries the tideline: a Hiroshige mudflat motif,
// wet-sand pigment exposed landward of the water's reach that widens at ebb
// and vanishes at flood, real astronomical tide from world/tide.ts.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WATER, TACOMA_WATER, WaterBody } from "./waterData";
import { projectLatLng } from "./network";
import { HAS_BASEMAP, BASEMAP_WATER, BasemapPolygon } from "./basemap";
import { buildStrip, mergeStrips } from "./ribbon";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { CONFIG } from "../world/config";
import { tideLevel } from "../world/tide";
import { WEATHER } from "../world/weather";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";
import { PAPER_CUT_GLSL } from "./paperCutGlsl";
import { PAPER_CUT_VEC } from "./paperCut";

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
  ${PAPER_CUT_GLSL}
  ${SEIGAIHA_GLSL}
  uniform vec3 uWater;
  uniform vec3 uSeigaiha;
  uniform float uSeigaihaIntensity;
  uniform float uOpacity;
  uniform float uBreath;
  uniform float uTime;
  uniform float uRain;

  // Raindrop rings: while real rain falls (world/weather.ts), sparse foam
  // circles swell outward over the pigment and dissolve — the drops you'd
  // never see landing, printed at toy scale in the seigaiha's own foam line.
  // Hash-scattered cells, each drop on its own clock; density rides the rain.
  float rainRings(vec2 w) {
    vec2 g = w * 1.4;
    vec2 cell = floor(g), f = fract(g);
    float h = wcHash(cell);
    float gate = step(1.0 - uRain * 0.55, wcHash(cell + 31.7));
    if (gate < 0.5) return 0.0;
    vec2 center = vec2(0.25) + 0.5 * vec2(h, wcHash(cell + 11.3));
    float life = fract(uTime * (0.3 + 0.25 * h) + h * 7.0);
    float r = life * 0.4; // the ring swells outward…
    float fade = 1.0 - life; // …and the line dissolves as it goes
    float d = abs(length(f - center) - r);
    return (1.0 - smoothstep(0.02, 0.05, d)) * fade;
  }

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
    if (uRain > 0.003) {
      water = mix(water, uSeigaiha, rainRings(vWorld) * uRain * 0.5);
    }
    vec3 c = mix(water, uFog, fogFactor());
    // Both passes (the under-fill and the over-print stamp) are pigment on or
    // under the sheet: carved away with it inside the dive incision, so the
    // pit near a waterside hall (UW, by the Montlake Cut) stays dry paper.
    gl_FragColor = vec4(c, uOpacity * blotch * (0.9 + 0.1 * uBreath) * cutKeep(vWorld));
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
  ${PAPER_CUT_GLSL}
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform vec3 uTideFlat;
  uniform float uIntensity;
  uniform float uTideFlatIntensity;
  uniform float uTide; // -1 ebb .. +1 flood — a slow astronomical breath
  #define TIDE_REACH_BASE 0.85
  #define TIDE_REACH_SWING 0.28
  void main() {
    // uTide walks the waterline across the strand: at flood the pigment pools
    // wider and deeper up the paper, at ebb it thins back to a faint line and
    // recedes. Sub-perceptual moment to moment, hours to swing — the Sound
    // breathing. See world/tide.ts (astronomical phase, never a gauge number).
    float band = (vUv.y * 2.0 - 1.0) - uTide * 0.2; // waterline drifts with tide
    float across = abs(band);
    float reach = TIDE_REACH_BASE + uTide * TIDE_REACH_SWING; // flood pools further out
    float core = pow(smoothstep(reach, 0.0, across), 1.6);
    float pool = 0.75 + 0.35 * wcNoise(vWorld * 2.2); // pigment pooling
    float tideGain = 0.72 + 0.28 * (uTide * 0.5 + 0.5); // more pigment at flood
    float waterAlpha = core * pool * uIntensity * tideGain;

    // The tideline motif: a Hiroshige-style exposed mudflat/wet-sand band,
    // landward of the water's current reach out to the historical high-tide
    // mark (reach at uTide = +1). It widens as the real tide ebbs — bare
    // strand appearing where the pigment just receded — and narrows to
    // nothing at flood, when the water pigment already covers the whole mark.
    float highReach = TIDE_REACH_BASE + TIDE_REACH_SWING;
    float exposed = smoothstep(reach, reach + 0.10, across)
      * (1.0 - smoothstep(highReach - 0.05, highReach + 0.05, across));
    float grain = 0.7 + 0.4 * wcNoise(vWorld * 3.1 + 7.3); // sand/rock mottle
    float flatAlpha = exposed * grain * uTideFlatIntensity;

    // Normal-blended pigment (mix toward fog per the raw-ShaderMaterial
    // contract): literal blue pooling along the shoreline, able to darken
    // the bright paper it meets; the strand mixes the same way so it recedes
    // into the same aerial haze at distance.
    vec3 waterColor = mix(uColor, uFog, fogFactor());
    vec3 flatColor = mix(uTideFlat, uFog, fogFactor());
    float totalAlpha = waterAlpha + flatAlpha;
    vec3 c = totalAlpha > 0.0001 ? mix(flatColor, waterColor, waterAlpha / totalAlpha) : waterColor;
    gl_FragColor = vec4(c, totalAlpha * cutKeep(vWorld)); // carved with the sheet
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

function projectBodies(bodies: WaterBody[]): BasemapPolygon[] {
  return bodies.map((body) => ({
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

function fallbackPolygons(): BasemapPolygon[] {
  return projectBodies(WATER);
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
  // The tide moves over hours; sampling it every few seconds is plenty and
  // keeps the suncalc call off the hot path.
  const tideRef = useRef({ next: 0, val: tideLevel() });

  const { fillGeometry, edgeGeometry } = useMemo(() => {
    // Tacoma's coast is south of the basemap bbox, so it never comes from
    // BASEMAP_WATER — always append the hand-authored Commencement Bay + Foss
    // Waterway rings (they're excluded from the WATER fallback, which the
    // basemap already covers up north, so this can't double them).
    const polys = [
      ...(HAS_BASEMAP ? BASEMAP_WATER : fallbackPolygons()),
      ...projectBodies(TACOMA_WATER),
    ];
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
      fillRef.current.uniforms.uRain.value = WEATHER.rain;
    }
    if (overRef.current) {
      overRef.current.uniforms.uTime.value = CLOCK.t;
      overRef.current.uniforms.uBreath.value = CLOCK.breath;
      overRef.current.uniforms.uFogDensity.value = LIVE.fogDensity;
      overRef.current.uniforms.uOpacity.value = LIVE.waterOpacity * OVERPRINT;
      overRef.current.uniforms.uSeigaihaIntensity.value = LIVE.seigaihaIntensity;
      overRef.current.uniforms.uRain.value = WEATHER.rain;
    }
    if (edgeRef.current) {
      if (CLOCK.t >= tideRef.current.next) {
        tideRef.current.val = tideLevel();
        tideRef.current.next = CLOCK.t + 4;
      }
      edgeRef.current.uniforms.uTime.value = CLOCK.t;
      edgeRef.current.uniforms.uTide.value = tideRef.current.val;
      edgeRef.current.uniforms.uIntensity.value = LIVE.waterEdgeIntensity;
      edgeRef.current.uniforms.uTideFlatIntensity.value = LIVE.tideFlatIntensity;
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
            uCut: { value: PAPER_CUT_VEC }, // shared cut signal, by reference
            uBreath: { value: 0 },
            uRain: { value: 0 },
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
            uCut: { value: PAPER_CUT_VEC }, // shared cut signal, by reference
            uBreath: { value: 0 },
            uRain: { value: 0 },
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
            uTideFlat: { value: LIVE.tideFlat },
            uIntensity: { value: LIVE.waterEdgeIntensity },
            uTideFlatIntensity: { value: LIVE.tideFlatIntensity },
            uTide: { value: 0 },
            uCut: { value: PAPER_CUT_VEC }, // shared cut signal, by reference
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
