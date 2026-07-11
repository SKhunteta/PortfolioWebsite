import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  MathUtils,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import { IS_TOUCH } from "../world/device";
import { useGravity } from "../world/GravityDial";
import { mulberry32 } from "../world/rng";
import { makeNoiseNormalMap } from "../fx/noiseTextures";
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
 *  drift, the cats brighten just enough to stay readable in every shot. */
function CatGlow({ mats }: { mats: CatMats }) {
  useFrame(() => {
    const g = useGravity.getState().g;
    (mats.body as MeshStandardMaterial).emissiveIntensity = MathUtils.lerp(0.58, 0.3, g);
  });
  return null;
}

export function Cats() {
  const geoms = useMemo<CatGeoms>(
    () => ({
      // Modelled on two real sleek black-shorthair girls: a lithe, elegant
      // body, a neat head with BIG pointed ears and big round eyes, and a long
      // tapering tail. Cuteness lives in the ears + eyes, not in bulk.
      haunch: new SphereGeometry(0.125, 14, 10),
      barrel: new CapsuleGeometry(0.106, 0.19, 6, 12),
      chest: new SphereGeometry(0.11, 14, 10),
      skull: new SphereGeometry(0.106, 16, 12),
      muzzle: new SphereGeometry(0.047, 10, 8),
      nose: new SphereGeometry(0.016, 8, 6),
      cheek: new SphereGeometry(0.036, 10, 8), // slight cheek, not chunky
      ear: new ConeGeometry(0.058, 0.14, 6), // big pointed shorthair ears
      earInner: new ConeGeometry(0.038, 0.105, 6),
      eye: new SphereGeometry(0.031, 14, 12), // big round golden eyes
      tailSeg: new CapsuleGeometry(0.023, 0.09, 5, 10), // long, sleek tail
      tailTuft: new SphereGeometry(0.03, 10, 8), // slim tapered tip
      thigh: new CapsuleGeometry(0.032, 0.09, 4, 8),
      shin: new CapsuleGeometry(0.022, 0.09, 4, 8),
      paw: new SphereGeometry(0.031, 8, 6),
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
    // A soft charcoal-plum plush, not wet vinyl: low clearcoat + high roughness
    // + strong sheen give a fuzzy backlit-fur rim so the silhouette reads even
    // in the drift's dim light. A faint cool emissive floor keeps the cats from
    // ever sinking into pure black (well under the 1.05 bloom threshold).
    const body = IS_TOUCH
      ? new MeshStandardMaterial({
          color: "#191519",
          roughness: 0.52,
          metalness: 0.1,
          emissive: new Color("#241a20"),
          emissiveIntensity: 0.32,
        })
      : new MeshPhysicalMaterial({
          color: "#191519",
          roughness: 0.48,
          clearcoat: 0.5,
          clearcoatRoughness: 0.35,
          sheen: 1,
          sheenColor: new Color("#8a7686"),
          sheenRoughness: 0.5,
          emissive: new Color("#241a20"),
          emissiveIntensity: 0.32,
          normalMap: furNormal,
          normalScale: new Vector2(0.35, 0.35),
        });
    return {
      body,
      // Soft dusty-pink inner ears — a matte, gently self-lit cuteness accent.
      innerEar: new MeshStandardMaterial({
        color: "#b47f8b",
        roughness: 0.9,
        emissive: new Color("#b47f8b"),
        emissiveIntensity: 0.12,
      }),
      // Emissive ABOVE the bloom threshold — the glowing eyes are HDR sources.
      eye: new MeshStandardMaterial({
        color: "#000000",
        emissive: "#ffc23a",
        emissiveIntensity: 2.6,
        roughness: 0.3,
      }),
      eyeAlt: new MeshStandardMaterial({
        color: "#000000",
        emissive: "#ffb02a",
        emissiveIntensity: 2.4,
        roughness: 0.3,
      }),
      nose: new MeshStandardMaterial({
        color: "#6e5560",
        emissive: "#6e5560",
        emissiveIntensity: 0.15,
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
