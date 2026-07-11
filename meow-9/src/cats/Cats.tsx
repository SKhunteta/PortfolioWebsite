import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  MathUtils,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import { IS_TOUCH } from "../world/device";
import { useGravity } from "../world/GravityDial";
import { mulberry32 } from "../world/rng";
import { PALETTE, mix } from "../world/palettes";
import { makeFurAlphaMap, makeNoiseNormalMap, makeNoiseRoughnessMap } from "../fx/noiseTextures";
import { applyFurRim, furUniforms, makeFuzzMaterial } from "./fur";
import { Cat, type CatGeoms, type CatMats, type CatSpec } from "./Cat";
import { catBodies, publishDriftCat } from "./direction";

// The sanctuary roster. Every cat shares one glossy-black body material and
// one geometry set (sixteen cats × identical parts — worth sharing, unlike
// Ketu-9's three bears); each gets its own seed, size, and personality.

const COUNT = IS_TOUCH ? 10 : 16;

const CATS: CatSpec[] = (() => {
  const r = mulberry32(909);
  const roster: CatSpec[] = Array.from({ length: COUNT }, (_, i) => ({
    x: (r() * 2 - 1) * 5.6,
    z: (r() * 2 - 1) * 3.8,
    size: 0.85 + r() * 0.3,
    lazy: r(),
    playful: r(),
    seed: 1000 + i * 37,
  }));
  // The two real girls, up front: the hero wears her collar with the little
  // gold tag (photo-accurate), her sister a blue one (like her fish toy).
  roster[0].collar = "A";
  roster[0].size = 1.0;
  roster[1].collar = "B";
  roster[1].size = 0.95;
  return roster;
})();

/** Publishes the fastest-tumbling cat as the "driftCat" track point.
 *  Mounted after the cats so their reports for this frame are already in
 *  (R3F runs same-priority useFrame subscribers in mount order). The dev
 *  guard below catches an accidental reorder: if this ran first, no cat
 *  would have registered its body yet on our first frame. */
function DriftTracker() {
  const checked = useRef(false);
  useFrame(() => {
    if (import.meta.env.DEV && !checked.current) {
      checked.current = true;
      let n = 0;
      for (const b of catBodies) if (b) n++;
      if (n < COUNT) {
        console.error(
          `[meow-9] DriftTracker ran before the cats (${n}/${COUNT} registered). ` +
            "It must mount AFTER all <Cat/>s — see publishDriftCat() in direction.ts."
        );
      }
    }
    publishDriftCat();
  });
  return null;
}

/** The fur's faint self-light rides the dial: as the room dims into the
 *  drift, the cats brighten just enough to stay readable in every shot.
 *  The Fresnel rim rides along — warm plum under the lamps, neon-violet
 *  and a touch stronger in the drift (fur reads more backlit in the dark). */
function CatGlow({ mats }: { mats: CatMats }) {
  useFrame(() => {
    const g = useGravity.getState().g;
    (mats.body as MeshStandardMaterial).emissiveIntensity = MathUtils.lerp(0.58, 0.3, g);
    // copy() — mix() returns a shared scratch Color.
    furUniforms.rimColor.value.copy(mix(PALETTE.furRimDrift, PALETTE.furRimSpin, g));
    furUniforms.rimStrength.value = MathUtils.lerp(0.68, 0.5, g);
  });
  return null;
}

export function Cats() {
  const geoms = useMemo<CatGeoms>(
    () => ({
      // Modelled on two real black-shorthair girls, but pushed toward KITTEN
      // proportions — adorable is neoteny: an oversized round head, big low
      // eyes, chubby cheeks, a plump compact tummy, and stubby chunky paws.
      // The elegant adult silhouette read as "a cat"; this reads as "aww".
      haunch: new SphereGeometry(0.132, 14, 10), // rounder rump
      barrel: new CapsuleGeometry(0.115, 0.155, 6, 12), // short, plump tummy
      chest: new SphereGeometry(0.12, 14, 10), // fuller chest
      skull: new SphereGeometry(0.118, 16, 12), // big baby head
      muzzle: new SphereGeometry(0.044, 10, 8), // shorter, flatter face
      nose: new SphereGeometry(0.017, 8, 6),
      cheek: new SphereGeometry(0.046, 10, 8), // chubby kitten cheeks
      ear: new ConeGeometry(0.058, 0.135, 6), // big pointed ears
      earInner: new ConeGeometry(0.038, 0.102, 6),
      eye: new SphereGeometry(0.037, 16, 14), // big round eyes — the charm
      catchlight: new SphereGeometry(0.009, 8, 6), // the wet glint that lives
      tailSeg: new CapsuleGeometry(0.025, 0.085, 5, 10),
      tailTuft: new SphereGeometry(0.033, 10, 8),
      thigh: new CapsuleGeometry(0.04, 0.085, 4, 8), // chunky little legs
      shin: new CapsuleGeometry(0.03, 0.085, 4, 8),
      paw: new SphereGeometry(0.038, 8, 6), // plump toe beans
      // Real-cat details: whiskers, vertical slit pupils, and the collar.
      whisker: (() => {
        const w = new CylinderGeometry(0.0013, 0.0008, 0.105, 3);
        w.translate(0, 0.0525, 0); // grow from the base so rotation fans it
        return w;
      })(),
      pupil: new CapsuleGeometry(0.0058, 0.026, 3, 8),
      collar: new TorusGeometry(0.098, 0.013, 8, 22),
      tag: new SphereGeometry(0.02, 10, 8),
    }),
    []
  );

  const mats = useMemo<CatMats>(() => {
    const furNormal = makeNoiseNormalMap(256, 6, 1.1, 21);
    // Streaky micro-variation so light breaks across the coat like guard
    // hairs instead of one uniform sheen.
    const furRough = makeNoiseRoughnessMap(256, 5, 0.42, 0.78, 33);
    // Matte plush, NOT wet vinyl. Glossy black eats the soft shading
    // gradients that read as "round and cuddly", so we lift the black off
    // pure #000 to a warm charcoal-plum, drop the clearcoat that was making
    // it look like patent leather, and lean on high roughness + a warm sheen
    // for a fuzzy backlit-fur rim. The lifted base keeps the round forms
    // legible even in the drift's gloom (well under the 1.05 bloom threshold).
    const body = IS_TOUCH
      ? new MeshStandardMaterial({
          color: "#241e25",
          roughness: 0.66,
          metalness: 0.04,
          emissive: new Color("#2a1f27"),
          emissiveIntensity: 0.34,
          roughnessMap: furRough,
        })
      : new MeshPhysicalMaterial({
          color: "#241e25",
          roughness: 0.64,
          clearcoat: 0.12,
          clearcoatRoughness: 0.6,
          sheen: 1,
          sheenColor: new Color("#9a8390"),
          sheenRoughness: 0.55,
          emissive: new Color("#2a1f27"),
          emissiveIntensity: 0.34,
          normalMap: furNormal,
          normalScale: new Vector2(0.32, 0.32),
          roughnessMap: furRough,
        });
    // The Fresnel fur rim rides both device profiles (same shader chunks).
    applyFurRim(body);
    return {
      body,
      // Halo shells for the big masses — desktop-only meshes in Cat.tsx.
      fuzz: makeFuzzMaterial(makeFurAlphaMap(256, 47)),
      // Soft dusty-pink inner ears — a matte, gently self-lit cuteness accent.
      innerEar: new MeshStandardMaterial({
        color: "#c98f9b",
        roughness: 0.9,
        emissive: new Color("#c98f9b"),
        emissiveIntensity: 0.14,
      }),
      // Emissive ABOVE the bloom threshold — the glowing eyes are HDR sources.
      // Gold on most; canon says every third girl is GREEN-eyed (eyeAlt).
      eye: new MeshStandardMaterial({
        color: "#000000",
        emissive: "#ffc23a",
        emissiveIntensity: 2.6,
        roughness: 0.3,
      }),
      eyeAlt: new MeshStandardMaterial({
        color: "#000000",
        emissive: "#7bf0a2", // jade-green — the every-third-cat pop of color
        emissiveIntensity: 2.3,
        roughness: 0.3,
      }),
      // The catchlight: a tiny crisp white glint that makes an eye read as
      // wet and alive instead of a flat glowing orb. Unlit + under the bloom
      // threshold, so it's a sharp speck, not another glow.
      catchlight: new MeshBasicMaterial({ color: "#fffaf0" }),
      // A little pink kitten nose, self-lit just enough to read on black.
      nose: new MeshStandardMaterial({
        color: "#a86e77",
        emissive: new Color("#a86e77"),
        emissiveIntensity: 0.2,
      }),
      // Whiskers self-lit just enough to read against a black face.
      whisker: new MeshStandardMaterial({
        color: "#e8e6ea",
        roughness: 0.6,
        emissive: new Color("#8a8590"),
        emissiveIntensity: 0.4,
      }),
      pupil: new MeshStandardMaterial({ color: "#060608", roughness: 0.35 }),
      collar: new MeshStandardMaterial({ color: "#352a3a", roughness: 0.7 }),
      // The hero girl's little gold tag (kept under the 1.05 bloom threshold).
      tagA: new MeshStandardMaterial({
        color: "#caa23a",
        metalness: 0.6,
        roughness: 0.35,
        emissive: new Color("#ffb02a"),
        emissiveIntensity: 0.8,
      }),
      tagB: new MeshStandardMaterial({
        color: "#3aa5c9",
        metalness: 0.4,
        roughness: 0.4,
        emissive: new Color("#5ee9ff"),
        emissiveIntensity: 0.7,
      }),
    };
  }, []);

  return (
    <group>
      {CATS.map((spec, i) => (
        <Cat key={i} index={i} spec={spec} geoms={geoms} mats={mats} />
      ))}
      <DriftTracker />
      <CatGlow mats={mats} />
    </group>
  );
}
