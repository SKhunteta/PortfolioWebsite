// The layered walls of the incision (see map/paperCut.ts). While a dive
// holds, a short stack of paper sheets hangs in the depth between the
// surface and the tunnel roof around the dived hall, each torn open on its
// own deckled line, each a step further in — so the aperture reads as a
// terraced cross-section of the paper block, and the sheets slide past one
// another in parallax as the camera precesses over the hall.
//
// ONE InstancedMesh (SHEET_COUNT instances, deepest first so the painter's
// order stacks shallow over deep), renderOrder 3.5 — over the hall floors,
// frescoes and crowd (2.9–3), under the surface sheet (4) — per the
// GroundPlane order table. Hidden ENTIRELY (visible=false, zero draw cost)
// whenever no dive is easing — the gated-critter rule. Normal-blended
// pigment on the fog contract; the paper voice is the ground's own palette
// references, dimmed per sheet with depth.
//
// This component is also the ONE writer of PAPER_CUT_VEC — the shared cut
// signal every carved material (ground, roads, parks, water, seals, the
// street life, the Buildings skylight) holds by reference.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LIVE } from "../world/palettes";
import { CLOCK } from "../world/clock";
import { useUi } from "../trains/store";
import { undergroundSiteById, type UndergroundSite } from "../stations/platformPulse";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";
import { PAPER_CUT_GLSL } from "./paperCutGlsl";
import {
  PAPER_CUT_VEC,
  buildCutSheets,
  easeCutStrength,
  SHEET_AMP,
  SHEET_BODY_R,
  SHEET_FADE_R,
} from "./paperCut";

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aRadius;
  attribute float aSeed;
  attribute float aShade;
  varying float vRadius;
  varying float vSeed;
  varying float vShade;
  void main() {
    vRadius = aRadius;
    vSeed = aSeed;
    vShade = aShade;
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
  ${PAPER_CUT_GLSL}
  uniform vec3 uGround;
  uniform vec3 uPaperTint;
  varying float vRadius;
  varying float vSeed;
  varying float vShade;
  void main() {
    vec2 d = vWorld - uCut.xy;
    float r = length(d);
    // The sheet dissolves well before its quad edge could ever print a line.
    float body = 1.0 - smoothstep(${SHEET_BODY_R.toFixed(2)}, ${SHEET_FADE_R.toFixed(2)}, r);
    if (body < 0.004) discard;
    // This sheet's own deckled tear, with its fringe of hanging fibers.
    float er = cutEdgeR(d, vRadius, ${SHEET_AMP.toFixed(3)}, vSeed);
    float fib = wcNoise(cutDir(d) * 42.0 + vSeed * 1.3);
    float reach = 0.012 + 0.07 * fib * fib;
    float strand = smoothstep(er - reach, er - reach * 0.2, r) * smoothstep(0.35, 0.75, fib);
    float inside = 1.0 - smoothstep(er - 0.005, er + 0.005, r);
    // Sheets settle in as the tear blossoms (a hair behind it, so the far
    // print never darkens before the incision is visibly opening).
    float alpha = mix(1.0, strand * 0.9, inside) * body * smoothstep(0.1, 0.5, uCut.z);
    if (alpha < 0.004) discard;
    // The ground's paper voice, dimmed by depth into the pit.
    float wash = wcFbm(vWorld * 0.9 + vSeed);
    float tooth = wcNoise(vWorld * 22.0 + vSeed);
    vec3 c = (uGround + uPaperTint * (wash - 0.5)) * (1.0 + 0.10 * (tooth - 0.5)) * vShade;
    // Sumi pooled along this sheet's lip — the cut wall's shadow line.
    float lip = (1.0 - smoothstep(er, er + 0.16, r)) * (1.0 - inside);
    c = mix(c, vec3(0.12, 0.10, 0.095), lip * 0.45);
    // Exposed washi heart on the strands: a lift of the sheet's own tone, so
    // the fringe stays palette-bound (cream by day, dim warm at night).
    c = mix(c, min(c * 1.55 + vec3(0.04), vec3(0.94)), inside * strand);
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), alpha);
  }
`;

// `?cut=off` pins the incision closed: the shared strength stays 0, every
// carved shader early-outs, the landmark discard never compiles in, and the
// sheet stack never shows — the field-bisection lever for real-GPU triage
// (this scene's driver family has SwiftShader-invisible failure modes; see
// fx/Composer.tsx). A dive still frames the hall, just through the old
// translucent-sheet read.
const CUT_ENABLED =
  new URLSearchParams(window.location.search).get("cut") !== "off";

const matrix = new THREE.Matrix4();
const FLAT_QUAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
const POS = new THREE.Vector3();
const SCALE = new THREE.Vector3(SHEET_FADE_R, SHEET_FADE_R, SHEET_FADE_R);

export function PaperCut() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  // The last dived hall — held while the cut eases closed after a release, so
  // the tear heals in place instead of snapping to nowhere.
  const lastSite = useRef<UndergroundSite | null>(null);
  const placedFor = useRef<string | null>(null);

  const pools = useMemo(() => {
    const sheets = buildCutSheets();
    const n = sheets.length;
    const radius = new Float32Array(n);
    const seed = new Float32Array(n);
    const shade = new Float32Array(n);
    sheets.forEach((s, i) => {
      radius[i] = s.radius;
      seed[i] = s.seed;
      shade[i] = s.shade;
    });
    const geometry = new THREE.PlaneGeometry(2, 2);
    geometry.setAttribute("aRadius", new THREE.InstancedBufferAttribute(radius, 1));
    geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
    geometry.setAttribute("aShade", new THREE.InstancedBufferAttribute(shade, 1));
    return { sheets, count: n, geometry };
  }, []);

  useFrame(() => {
    // The single write of the shared cut signal: hold the last hall's center,
    // ease the strength toward open while a dive holds and closed otherwise.
    const diveId = useUi.getState().diveStationId;
    const site = diveId ? undergroundSiteById(diveId) : undefined;
    if (site) lastSite.current = site;
    const target = lastSite.current;
    PAPER_CUT_VEC.z = CUT_ENABLED
      ? easeCutStrength(PAPER_CUT_VEC.z, !!site, CLOCK.dt)
      : 0;
    if (target) {
      PAPER_CUT_VEC.x = target.x;
      PAPER_CUT_VEC.y = target.z;
    }

    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.visible = PAPER_CUT_VEC.z > 0.002; // off-stage = zero cost
    if (!mesh.visible) return;
    if (target && placedFor.current !== target.id) {
      placedFor.current = target.id;
      for (let i = 0; i < pools.count; i++) {
        POS.set(target.x, pools.sheets[i].y, target.z);
        matrix.compose(POS, FLAT_QUAT, SCALE);
        mesh.setMatrixAt(i, matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
    (mesh.material as THREE.ShaderMaterial).uniforms.uFogDensity.value = LIVE.fogDensity;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, pools.count]}
      geometry={pools.geometry}
      renderOrder={3.5}
      frustumCulled={false}
      visible={false}
    >
      <shaderMaterial
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uCut: { value: PAPER_CUT_VEC }, // the shared signal, by reference
          uGround: { value: LIVE.ground }, // palette-by-reference
          uPaperTint: { value: LIVE.paperTint },
          uFog: { value: LIVE.fog },
          uFogDensity: { value: LIVE.fogDensity },
        }}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}
