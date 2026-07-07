import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CapsuleGeometry,
  Color,
  ConeGeometry,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Vector2,
} from "three";
import { IS_TOUCH } from "../world/device";
import { makeNoiseNormalMap } from "../fx/noiseTextures";
import { Cat, type CatGeoms, type CatMats, type CatSpec } from "./Cat";
import { publishDriftCat } from "./direction";

// The sanctuary roster. Every cat shares one glossy-black body material and
// one geometry set (sixteen cats × identical parts — worth sharing, unlike
// Ketu-9's three bears); each gets its own seed, size, and personality.

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COUNT = IS_TOUCH ? 10 : 16;

const CATS: CatSpec[] = (() => {
  const r = mulberry32(909);
  return Array.from({ length: COUNT }, (_, i) => ({
    x: (r() * 2 - 1) * 5.6,
    z: (r() * 2 - 1) * 3.8,
    size: 0.85 + r() * 0.3,
    lazy: r(),
    playful: r(),
    seed: 1000 + i * 37,
  }));
})();

/** Publishes the fastest-tumbling cat as the "driftCat" track point.
 *  Mounted after the cats so their reports for this frame are already in. */
function DriftTracker() {
  useFrame(() => publishDriftCat());
  return null;
}

export function Cats() {
  const geoms = useMemo<CatGeoms>(
    () => ({
      // Rounder, chubbier body + a big kitten head with saucer eyes — the
      // proportions that read as "adorable", not "anatomical".
      haunch: new SphereGeometry(0.14, 14, 10),
      barrel: new CapsuleGeometry(0.12, 0.16, 6, 12),
      chest: new SphereGeometry(0.125, 14, 10),
      skull: new SphereGeometry(0.118, 16, 12),
      muzzle: new SphereGeometry(0.055, 10, 8),
      nose: new SphereGeometry(0.018, 8, 6),
      cheek: new SphereGeometry(0.05, 10, 8), // chubby cheek fluff
      ear: new ConeGeometry(0.052, 0.11, 6), // bigger, softer ears
      earInner: new ConeGeometry(0.032, 0.078, 6), // dusty-pink inner ear
      eye: new SphereGeometry(0.032, 14, 12), // big glowing kitten eyes
      tailSeg: new CapsuleGeometry(0.03, 0.07, 5, 10), // plush, fluffier tail
      tailTuft: new SphereGeometry(0.052, 10, 8), // fluffy tail tip
      thigh: new CapsuleGeometry(0.036, 0.085, 4, 8),
      shin: new CapsuleGeometry(0.025, 0.085, 4, 8),
      paw: new SphereGeometry(0.036, 8, 6),
    }),
    []
  );

  const mats = useMemo<CatMats>(() => {
    const furNormal = makeNoiseNormalMap(256, 6, 1.4, 21);
    // A soft charcoal-plum plush, not wet vinyl: low clearcoat + high roughness
    // + strong sheen give a fuzzy backlit-fur rim so the silhouette reads even
    // in the drift's dim light. A faint cool emissive floor keeps the cats from
    // ever sinking into pure black (well under the 1.05 bloom threshold).
    const body = IS_TOUCH
      ? new MeshStandardMaterial({
          color: "#2c2a38",
          roughness: 0.72,
          metalness: 0.05,
          emissive: new Color("#191b2c"),
          emissiveIntensity: 0.4,
        })
      : new MeshPhysicalMaterial({
          color: "#2c2a38",
          roughness: 0.66,
          clearcoat: 0.28,
          clearcoatRoughness: 0.6,
          sheen: 1,
          sheenColor: new Color("#8b93c8"),
          sheenRoughness: 0.4,
          emissive: new Color("#191b2c"),
          emissiveIntensity: 0.4,
          normalMap: furNormal,
          normalScale: new Vector2(0.6, 0.6),
        });
    return {
      body,
      // Soft dusty-pink inner ears — a matte, gently self-lit cuteness accent.
      innerEar: new MeshStandardMaterial({
        color: "#d69aa6",
        roughness: 0.85,
        emissive: new Color("#d69aa6"),
        emissiveIntensity: 0.25,
      }),
      // Emissive ABOVE the bloom threshold — the glowing eyes are HDR sources.
      eye: new MeshStandardMaterial({
        color: "#000000",
        emissive: "#ffc94d",
        emissiveIntensity: 2.4,
        roughness: 0.3,
      }),
      eyeAlt: new MeshStandardMaterial({
        color: "#000000",
        emissive: "#7dffb0",
        emissiveIntensity: 2.2,
        roughness: 0.3,
      }),
      nose: new MeshStandardMaterial({
        color: "#e08696",
        emissive: "#e08696",
        emissiveIntensity: 0.45,
      }),
    };
  }, []);

  return (
    <group>
      {CATS.map((spec, i) => (
        <Cat key={i} index={i} spec={spec} geoms={geoms} mats={mats} />
      ))}
      <DriftTracker />
    </group>
  );
}
