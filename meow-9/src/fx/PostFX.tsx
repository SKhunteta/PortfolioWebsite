import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, DepthOfField, SMAA, Vignette } from "@react-three/postprocessing";
import type { DepthOfFieldEffect } from "postprocessing";
import { HalfFloatType, MathUtils, Vector3 } from "three";
import { IS_TOUCH } from "../world/device";

// The cinematic stack: SMAA → Bloom → DepthOfField → Vignette.
// Bloom's threshold sits ABOVE 1.0 so only genuine HDR sources ignite — the
// neon deck strips, the cats' eyes, the laser dot — and the base grade stays
// untouched. DoF is driven by the Observer director through `dofChannel`: the
// effect never unmounts (rebuilding the composer hitches); instead bokehScale
// damps to zero whenever no shot wants focus.
//
// IS_TOUCH renders nothing at all — the whole composer is desktop-only.

/** Written by ObserverMode; read here every frame. Plain mutable channel. */
export const dofChannel = {
  enabled: false,
  point: new Vector3(),
  range: 4,
  bokeh: 3.5,
};

function Effects() {
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

export function PostFX() {
  if (IS_TOUCH) return null;
  return <Effects />;
}
