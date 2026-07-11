import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, DepthOfField, SMAA, Vignette } from "@react-three/postprocessing";
import type { DepthOfFieldEffect } from "postprocessing";
import { HalfFloatType, MathUtils, Vector3 } from "three";
import { PROFILE } from "../world/device";

// The cinematic stack, tiered by PROFILE.composer:
//   "full" (desktop) — SMAA → Bloom → DepthOfField → Vignette.
//   "lite" (tablet)  — Bloom → Vignette with MSAA 4× instead of SMAA and no
//                      DoF: iPads finally get the neon bloom without paying
//                      for the two most expensive passes.
//   "off"  (phone)   — no composer at all.
// Bloom's threshold sits ABOVE 1.0 so only genuine HDR sources ignite — the
// neon deck strips, the cats' eyes, the laser dot — and the base grade stays
// untouched. DoF is driven by the Observer director through `dofChannel`: the
// effect never unmounts (rebuilding the composer hitches); instead bokehScale
// damps to zero whenever no shot wants focus. ObserverMode writes dofChannel
// unconditionally — harmless on the tiers with no DoF effect to read it.

/** Written by ObserverMode; read here every frame. Plain mutable channel. */
export const dofChannel = {
  enabled: false,
  point: new Vector3(),
  range: 4,
  bokeh: 3.5,
};

function FullEffects() {
  const dofRef = useRef<DepthOfFieldEffect>(null);

  useFrame(({ camera }, dt) => {
    const e = dofRef.current;
    if (!e) return;
    const target = dofChannel.enabled ? dofChannel.bokeh : 0;
    e.bokehScale = MathUtils.damp(e.bokehScale, target, 6, dt);
    if (dofChannel.enabled) {
      e.cocMaterial.worldFocusDistance = camera.position.distanceTo(dofChannel.point);
      e.cocMaterial.worldFocusRange = dofChannel.range;
    }
  });

  return (
    <EffectComposer multisampling={0} frameBufferType={HalfFloatType}>
      <SMAA />
      <Bloom mipmapBlur intensity={0.7} luminanceThreshold={1.05} luminanceSmoothing={0.15} />
      <DepthOfField ref={dofRef} bokehScale={0} worldFocusDistance={5} worldFocusRange={4} />
      <Vignette offset={0.32} darkness={0.42} />
    </EffectComposer>
  );
}

function LiteEffects() {
  return (
    <EffectComposer multisampling={4} frameBufferType={HalfFloatType}>
      <Bloom mipmapBlur intensity={0.7} luminanceThreshold={1.05} luminanceSmoothing={0.15} />
      <Vignette offset={0.32} darkness={0.42} />
    </EffectComposer>
  );
}

export function PostFX() {
  if (PROFILE.composer === "off") return null;
  return PROFILE.composer === "lite" ? <LiteEffects /> : <FullEffects />;
}
