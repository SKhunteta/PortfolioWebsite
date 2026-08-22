// The woodblock town: the field of tiny houses and low blocks that lines
// every street in the print, thickening into massed towers where downtown
// takes over. FIVE InstancedMeshes now — one per merged unit silhouette
// (hipped house, gabled house, long low machiya, flat-roof commercial block
// with a parapet lip, stepped-crown tower) — five draw calls total, all
// sharing ONE uniforms object so the palette, fog, and the uDive skylight
// behave identically across the whole fabric. Each instance is placed on a
// road frontage (map/scatter.ts) turned to face the street, scaled low in
// the neighborhoods and tall toward the core, and the variant is chosen by
// context: towers and parapet blocks downtown, gable/hip/machiya rows in
// the neighborhoods.
//
// The shader draws the town like a print, not a render: a fixed key light
// from the northwest over a watercolor wash (the color block deliberately
// slipped a few meters off the keyblock — woodblock misregistration), sumi
// keylines on the silhouette edges and the roof/wall crease, an eave shadow
// band seating each roof, a wet contact wash pooling at the ground line,
// per-instance three-way roof pigment (indigo / moss / rust leanings), a
// faint printed window hatch on the walls (ink, never light — CityLights
// owns the night windows), and a neighborhood-scale tone drift on the same
// noise family as the placement's townField so blocks read as printings.
// All ink is normal-blended and fades out with the fog so the distant town
// stays pale massed sepia, never black specks.
//
// The hero silhouettes (Needle, stadiums, Rainier) stay in Landmarks.tsx and
// paint just over this fabric; this is the quiet city around them.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LIVE } from "../world/palettes";
import { PAPER_CUT_VEC } from "./paperCut";
import { PROFILE } from "../world/device";
import { CONFIG } from "../world/config";
import { mulberry32, fbm, isWater, sampleRoadFrontages } from "./scatter";
import { projectLatLng } from "./network";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

// Hero landmarks the scattered town must NOT bury. SODO around the two
// stadiums is stadium footprint and parking, not a fabric of hipped-roof
// houses — but the road frontages run right past both bowls, so without a
// keep-out the generic blocks land on top of Lumen Field and T-Mobile Park and
// crowd their arches into an unreadable clump (Landmarks.tsx paints the bowls;
// this layer must clear the ground for them). Gasworks Park takes the same
// protection: N Northlake Way runs the park's top edge, and its frontage
// blocks would otherwise land among the cracking towers and on Kite Hill's
// open lawn. Keep-out discs in projected km, sized to cover each landmark
// with a little margin.
const KEEP_OUT: { x: number; z: number; r2: number }[] = [
  { ...projectLatLng(47.5952, -122.3316), r: 0.4 }, // Lumen Field
  { ...projectLatLng(47.5914, -122.3325), r: 0.4 }, // T-Mobile Park
  { ...projectLatLng(47.645, -122.3345), r: 0.2 }, // Gasworks Park — ruin, barn, Kite Hill
].map(({ x, z, r }) => ({ x, z, r2: r * r }));

function inKeepOut(x: number, z: number): boolean {
  for (const k of KEEP_OUT) {
    const dx = x - k.x;
    const dz = z - k.z;
    if (dx * dx + dz * dz < k.r2) return true;
  }
  return false;
}

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aTone;
  attribute float aSeed;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vY;
  varying float vUnitY; // unit-space height (pre-scale) — bands don't stretch
  varying float vH; // instance height scale (km) — houses vs towers branch
  varying float vTone;
  varying float vSeed;
  void main() {
    vTone = aTone;
    vSeed = aSeed;
    vUnitY = position.y;
    vH = length(instanceMatrix[1].xyz);
    vec4 world = instanceMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vY = world.y;
    vView = cameraPosition - world.xyz;
    vNormal = normalize((instanceMatrix * vec4(normal, 0.0)).xyz);
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

// CREASE (the roof/wall break in unit-space Y) is a per-variant #define;
// SETBACKS turns on the tower's printed setback bands. Everything else is
// shared, including the uniforms OBJECT itself — the uDive skylight and the
// palette references update once and every variant follows.
const FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform vec3 uDive; // xy = dived hall's world XZ, z = fade strength 0..1
  uniform vec3 uInk;
  uniform vec3 uRoofA;
  uniform vec3 uRoofB;
  uniform vec3 uRoofC;
  uniform vec2 uSlip; // color-block offset off the keyblock (world km)
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vY;
  varying float vUnitY;
  varying float vH;
  varying float vTone;
  varying float vSeed;
  void main() {
    // The color wash samples a few meters OFF the ink's coordinates —
    // woodblock misregistration: the pigment never quite lands on the key.
    float wash = wcFbm((vWorld + uSlip) * 0.9 + vTone * 9.0);
    // Fixed key light from the northwest sky — lit and shadowed faces diverge
    // so the little blocks read with dimension. The ambient floor sits HIGH:
    // these buildings are 1–3 px at drift distance, so a shadowed side must
    // still read as pale sepia, never average down to a black speck.
    vec3 n = normalize(vNormal);
    float key = 0.78 + 0.26 * max(0.0, dot(n, normalize(vec3(-0.5, 0.8, -0.45))));
    // Neighborhood tone drift on the placement townField's own noise family:
    // whole blocks lean a hair cool or a hair rust together, so the town
    // reads as separate printings, never per-house confetti.
    float nb = wcFbm(vWorld * 0.11 + vec2(3.1, 8.2));
    vec3 base = uColor * mix(vec3(0.985, 1.0, 1.035), vec3(1.035, 1.0, 0.955), smoothstep(0.35, 0.75, nb));
    // Two-pigment printing: roofs pull their own block — a per-instance
    // three-way lean (indigo / moss / rust) seeded once at placement.
    float roofM = smoothstep(0.45, 0.6, n.y) * step(CREASE - 0.03, vUnitY);
    vec3 roofPig = mix(uRoofA, uRoofB, step(0.34, vSeed));
    roofPig = mix(roofPig, uRoofC, step(0.67, vSeed));
    base = mix(base, roofPig, roofM);
    vec3 c = base * vTone * key * (0.92 + 0.18 * wash);
    // Roofs (up-facing, higher) catch a touch more light than the walls.
    c *= 0.96 + 0.12 * smoothstep(0.0, 0.5, vY);
    // --- the ink pass (normal-blended sumi, faded out with the fog so the
    // distant town keeps its pale massed read) ---
    float ff = fogFactor();
    float inkA = 1.0 - smoothstep(0.2, 0.6, ff);
    float wallM = 1.0 - smoothstep(0.25, 0.45, abs(n.y));
    // Fresnel-ish silhouette keyline: faces glancing away from the eye take
    // the sumi outline that keeps every block legible on bright paper.
    float rim = smoothstep(0.45, 0.12, abs(dot(n, normalize(vView))));
    // A thin hard keyline at the roof/wall crease (unit-space, no stretch)…
    float creaseInk = 1.0 - smoothstep(0.008, 0.03, abs(vUnitY - CREASE));
    // …and the eave shadow band hanging on the wall just below it.
    float eave = wallM * smoothstep(CREASE - 0.16, CREASE - 0.02, vUnitY) * (1.0 - step(CREASE, vUnitY));
    // Printed window hatch: faint horizontal ink rows on the walls — sparse
    // scattered rows on the houses, dense regular bands on the tall blocks.
    // Ink only, never light: CityLights.tsx owns the night windows.
    float tall = smoothstep(0.1, 0.3, vH);
    float rowFreq = mix(9.0, 24.0, tall);
    float rowPos = vUnitY * rowFreq + vSeed * 7.0;
    float keepRow = step(mix(0.55, 0.0, tall), wcHash(vec2(floor(rowPos), vSeed * 31.0)));
    float rf = fract(rowPos);
    float hatch = wallM * keepRow * smoothstep(0.3, 0.42, rf) * smoothstep(0.72, 0.6, rf)
      * smoothstep(0.05, 0.1, vUnitY) * (1.0 - smoothstep(CREASE - 0.2, CREASE - 0.1, vUnitY));
    // The tower's printed setback bands near the crown.
    float setb = 0.0;
    #ifdef SETBACKS
      setb = (1.0 - smoothstep(0.006, 0.022, abs(vUnitY - 0.7)))
           + (1.0 - smoothstep(0.006, 0.022, abs(vUnitY - 0.78)));
    #endif
    float ink = min(1.0, rim * 0.5 + creaseInk * 0.6 + eave * 0.4 + setb * 0.45 + hatch * 0.18);
    c = mix(c, uInk * (0.9 + 0.2 * wash), ink * inkA);
    // Ground contact wash: the bottom of every wall darkens toward a pooled
    // wet tone, seating the building on the paper.
    float contact = 1.0 - smoothstep(0.0, 0.06, vUnitY);
    c = mix(c, uInk * 0.85, contact * 0.32 * inkA);
    // The dive skylight: while the camera holds inside an underground hall,
    // the town within the hall's footprint thins to a ghost so the room
    // reads through the paper instead of hiding behind downtown's towers.
    // Widened to clear the whole incision (map/paperCut.ts CUT_SURFACE_R plus
    // its deckle) — a tower standing on paper that has been torn away would
    // give the cut the lie.
    float skylight = uDive.z * (1.0 - smoothstep(1.15, 1.75, distance(vWorld, uDive.xy)));
    gl_FragColor = vec4(
      mix(c, uFog, ff),
      uOpacity * (0.95 + 0.08 * wash) * (1.0 - 0.82 * skylight)
    );
  }
`;

const HEART = { x: CONFIG.camera.heartX, z: CONFIG.camera.heartZ };

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// --- the unit variants (each centered on XZ, base at y 0, height ~1) -------

/** Box body under a low 4-sided pyramid roof — the classic hipped house. */
function unitHipped(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(1, 0.7, 1);
  body.translate(0, 0.35, 0);
  const roof = new THREE.ConeGeometry(0.71, 0.32, 4);
  roof.rotateY(Math.PI / 4); // square the pyramid onto the body footprint
  roof.translate(0, 0.86, 0);
  const geo = mergeGeometries([body, roof], false)!;
  body.dispose();
  roof.dispose();
  return geo;
}

/** A triangular roof prism (ridge along local X — along the street once the
 *  instance yaws to face it), from a 3-sided cylinder laid on its side. */
function gablePrism(bodyTop: number, rise: number): THREE.BufferGeometry {
  // radius 0.577 → the triangle's base spans exactly 1 across Z with the
  // apex up once thetaStart puts a vertex at 12 o'clock.
  const roof = new THREE.CylinderGeometry(0.577, 0.577, 1, 3, 1, false, Math.PI / 2);
  roof.rotateZ(Math.PI / 2); // axis (the ridge) along X, closed ends = gables
  // Un-scaled the apex sits at +0.577 and the base edges at −0.289; flatten
  // to the wanted rise, then lift so the base edges land on the body top.
  const s = rise / 0.866;
  roof.scale(1, s, 1);
  roof.translate(0, bodyTop + 0.289 * s, 0);
  return roof;
}

/** Box body under a gable-end prism roof. */
function unitGabled(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(1, 0.7, 1);
  body.translate(0, 0.35, 0);
  const roof = gablePrism(0.7, 0.32);
  const geo = mergeGeometries([body, roof], false)!;
  body.dispose();
  roof.dispose();
  return geo;
}

/** Long low machiya block: shallow body, low gable ridge running the length
 *  of the street (the instance scales it long along local X). */
function unitMachiya(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(1, 0.55, 1);
  body.translate(0, 0.275, 0);
  const roof = gablePrism(0.55, 0.22);
  const geo = mergeGeometries([body, roof], false)!;
  body.dispose();
  roof.dispose();
  return geo;
}

/** Flat-roof commercial block with a parapet lip proud of the wall line. */
function unitFlat(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(1, 0.92, 1);
  body.translate(0, 0.46, 0);
  const lip = new THREE.BoxGeometry(1.06, 0.06, 1.06);
  lip.translate(0, 0.95, 0);
  const geo = mergeGeometries([body, lip], false)!;
  body.dispose();
  lip.dispose();
  return geo;
}

/** Slender stepped-crown tower — flat top under two shrinking setbacks, so
 *  downtown reads as stepped 1930s masses instead of stretched cottages. */
function unitTower(): THREE.BufferGeometry {
  const shaft = new THREE.BoxGeometry(1, 0.86, 1);
  shaft.translate(0, 0.43, 0);
  const crown1 = new THREE.BoxGeometry(0.78, 0.1, 0.78);
  crown1.translate(0, 0.91, 0);
  const crown2 = new THREE.BoxGeometry(0.56, 0.09, 0.56);
  crown2.translate(0, 0.995, 0);
  const geo = mergeGeometries([shaft, crown1, crown2], false)!;
  shaft.dispose();
  crown1.dispose();
  crown2.dispose();
  return geo;
}

interface Variant {
  make: () => THREE.BufferGeometry;
  crease: number; // roof/wall break in unit-space Y (the CREASE define)
  setbacks?: boolean;
}
const VARIANTS: Variant[] = [
  { make: unitHipped, crease: 0.7 },
  { make: unitGabled, crease: 0.7 },
  { make: unitMachiya, crease: 0.55 },
  { make: unitFlat, crease: 0.92 },
  { make: unitTower, crease: 0.86, setbacks: true },
];
const HIPPED = 0;
const GABLED = 1;
const MACHIYA = 2;
const FLAT = 3;
const TOWER = 4;

export function Buildings() {
  const meshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);

  // ONE shared uniforms object across every variant material: the palette
  // references, the fog, and the uDive skylight update once per frame and
  // all five meshes follow in lockstep.
  const uniforms = useMemo(
    () => ({
      uColor: { value: LIVE.building }, // palette-by-reference
      uOpacity: { value: LIVE.buildingOpacity },
      // The shared cut signal (map/paperCut.ts), by reference — PaperCut.tsx
      // eases it once per frame and the skylight follows the incision exactly.
      uDive: { value: PAPER_CUT_VEC },
      uInk: { value: LIVE.buildingInk },
      uRoofA: { value: LIVE.buildingRoofA },
      uRoofB: { value: LIVE.buildingRoofB },
      uRoofC: { value: LIVE.buildingRoofC },
      uSlip: { value: new THREE.Vector2(0.01, -0.007) }, // ~10 m misregistration
      uFog: { value: LIVE.fog },
      uFogDensity: { value: LIVE.fogDensity },
    }),
    [],
  );

  const materials = useMemo(
    () =>
      VARIANTS.map(
        (v) =>
          new THREE.ShaderMaterial({
            vertexShader: VERT,
            fragmentShader: FRAG,
            defines: { CREASE: v.crease.toFixed(2), ...(v.setbacks ? { SETBACKS: 1 } : {}) },
            uniforms, // the SAME object — never cloned
            transparent: true,
            depthWrite: false,
            side: THREE.FrontSide,
          }),
      ),
    [uniforms],
  );

  const variants = useMemo(() => {
    const rand = mulberry32(0xb17d);
    const target = PROFILE.buildingCount;
    // Frontages on both sides of every road; shuffle so the town spreads
    // across the whole network instead of filling the first streets.
    const pts = sampleRoadFrontages(0.11, 0.02);
    for (let i = pts.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = pts[i];
      pts[i] = pts[j];
      pts[j] = t;
    }
    const perVariant = VARIANTS.map(() => ({
      mats: [] as THREE.Matrix4[],
      tones: [] as number[],
      seeds: [] as number[],
    }));
    let total = 0;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    for (const p of pts) {
      if (total >= target) break;
      if (isWater(p.x, p.z)) continue;
      if (inKeepOut(p.x, p.z)) continue; // don't bury the SODO stadiums
      const dHeart = Math.hypot(p.x - HEART.x, p.z - HEART.z);
      const downtown = smoothstep(7.5, 0.5, dHeart);
      // The town gathers into settlements — a noise field gates where the
      // fabric appears, so the countryside between towns stays forest instead
      // of every rural road wearing a dotted line of houses.
      const townField = fbm(p.x * 0.11 + 3.1, p.z * 0.11 + 8.2);
      const townGate = smoothstep(0.5, 0.86, townField);
      const keepProb = Math.min(1, downtown + townGate * 0.85);
      if (rand() > keepProb) continue;
      // Pick the silhouette by context: stepped towers and parapet blocks
      // where downtown gathers, gable/hip rows with the odd machiya out in
      // the neighborhoods — and the old 2% odd-tower rule becomes a real
      // tower breaking the roofline anywhere.
      let variant: number;
      const oddTower = rand() < 0.02;
      if (oddTower) variant = TOWER;
      else if (downtown > 0.5) variant = rand() < 0.4 ? TOWER : FLAT;
      else if (downtown > 0.22) {
        const r = rand();
        variant = r < 0.45 ? FLAT : r < 0.75 ? GABLED : HIPPED;
      } else {
        const r = rand();
        variant = r < 0.42 ? HIPPED : r < 0.78 ? GABLED : MACHIYA;
      }
      // Face the street, with a jitter on the yaw so the rows don't read as a
      // ruled line. Local +Z faces the road, so d is depth off the street and
      // w runs along it.
      const yaw = Math.atan2(p.nx, p.nz) + (rand() - 0.5) * 0.6;
      let w = 0.045 + rand() * 0.075;
      let d = 0.045 + rand() * 0.075;
      let h = 0.04 + rand() * 0.07 + downtown * (0.07 + rand() * 0.36);
      if (variant === MACHIYA) {
        // Long and low, ridge running with the street.
        w = 0.09 + rand() * 0.08;
        d = 0.045 + rand() * 0.035;
        h = 0.035 + rand() * 0.04;
      } else if (variant === TOWER) {
        // Slender and tall — the mass that breaks the roofline.
        w *= 0.85;
        d *= 0.85;
        h = Math.max(h * 1.9, 0.14 + downtown * (0.1 + rand() * 0.2));
      }
      // The frontage point (p) already sits just outside the road stroke.
      // Set the house back by its own footprint so its street-facing wall — not
      // its center — lands on the frontage line, and jitter ONLY along the
      // street (jt) or further from it (jn, one-sided): a house must never
      // wander back onto the road it fronts.
      const footHalf = Math.max(w, d) / 2;
      const setout = footHalf + rand() * 0.03;
      const tx = p.nz; // road tangent (perpendicular to the outward normal)
      const tz = -p.nx;
      const jt = (rand() - 0.5) * 0.08;
      pos.set(p.x + p.nx * setout + tx * jt, 0.001, p.z + p.nz * setout + tz * jt);
      q.setFromAxisAngle(up, yaw);
      scl.set(w, h, d);
      m.compose(pos, q, scl);
      const bucket = perVariant[variant];
      bucket.mats.push(m.clone());
      bucket.tones.push(0.82 + rand() * 0.4);
      bucket.seeds.push(rand());
      total++;
    }
    // Per-instance tone + roof-pigment seed ride on each variant's geometry
    // as instanced attributes (the instancedMesh takes geometry via args, so
    // there's no JSX child to attach them through — set them directly).
    return VARIANTS.map((v, i) => {
      const geometry = v.make();
      const { mats, tones, seeds } = perVariant[i];
      geometry.setAttribute("aTone", new THREE.InstancedBufferAttribute(new Float32Array(tones), 1));
      geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(new Float32Array(seeds), 1));
      return { geometry, matrices: mats, count: mats.length };
    });
  }, []);

  const placed = useRef(false);
  useFrame(() => {
    if (!placed.current && meshRefs.current.some(Boolean)) {
      placed.current = true;
      variants.forEach((v, i) => {
        const mesh = meshRefs.current[i];
        if (!mesh) return;
        for (let j = 0; j < v.count; j++) mesh.setMatrixAt(j, v.matrices[j]);
        mesh.instanceMatrix.needsUpdate = true;
      });
    }
    // Shared uniforms object: one update drives every variant material. The
    // dive skylight rides the shared PAPER_CUT_VEC (eased by PaperCut.tsx),
    // so the town's ghosting and the paper's tearing breathe as one.
    uniforms.uOpacity.value = LIVE.buildingOpacity;
    uniforms.uFogDensity.value = LIVE.fogDensity;
  });

  return (
    <>
      {variants.map((v, i) =>
        v.count ? (
          <instancedMesh
            key={i}
            ref={(mesh) => (meshRefs.current[i] = mesh)}
            args={[v.geometry, materials[i], v.count]}
            renderOrder={6.2}
            frustumCulled={false}
          />
        ) : null,
      )}
    </>
  );
}
