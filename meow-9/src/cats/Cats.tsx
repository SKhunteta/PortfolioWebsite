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
      haunch: new SphereGeometry(0.13, 14, 10),
      barrel: new CapsuleGeometry(0.11, 0.17, 6, 12),
      chest: new SphereGeometry(0.115, 14, 10),
      skull: new SphereGeometry(0.1, 16, 12),
      muzzle: new SphereGeometry(0.05, 10, 8),
      nose: new SphereGeometry(0.016, 8, 6),
      ear: new ConeGeometry(0.042, 0.095, 4),
      eye: new SphereGeometry(0.023, 10, 8),
      tailSeg: new CapsuleGeometry(0.02, 0.075, 4, 8),
      thigh: new CapsuleGeometry(0.032, 0.085, 4, 8),
      shin: new CapsuleGeometry(0.023, 0.085, 4, 8),
      paw: new SphereGeometry(0.032, 8, 6),
    }),
    []
  );

  const mats = useMemo<CatMats>(() => {
    const furNormal = makeNoiseNormalMap(256, 6, 1.1, 21);
    const body = IS_TOUCH
      ? new MeshStandardMaterial({ color: "#101016", roughness: 0.5 })
      : new MeshPhysicalMaterial({
          color: "#0d0d12",
          roughness: 0.42,
          clearcoat: 0.9,
          clearcoatRoughness: 0.3,
          sheen: 0.5,
          sheenColor: new Color("#39405c"),
          sheenRoughness: 0.6,
          normalMap: furNormal,
          normalScale: new Vector2(0.35, 0.35),
        });
    return {
      body,
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
        color: "#b56576",
        emissive: "#b56576",
        emissiveIntensity: 0.3,
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
