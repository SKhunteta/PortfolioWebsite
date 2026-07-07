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
