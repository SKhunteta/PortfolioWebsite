// Post stack by tier. Phone: nothing — the painted sprite glow carries the
// look. Tablet: bloom + vignette. Desktop adds film grain. Bloom threshold
// sits just above 1.0 so only deliberate HDR sources ignite (train cores,
// dwell pulses); everything else must stay under it.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, Noise } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { PROFILE } from "../world/device";
import { LIVE } from "../world/palettes";

export function Composer() {
  const bloomRef = useRef<{ intensity: number } | null>(null);

  useFrame(() => {
    if (bloomRef.current) bloomRef.current.intensity = LIVE.bloomIntensity;
  });

  if (PROFILE.composer === "off") return null;

  return (
    <EffectComposer multisampling={PROFILE.composer === "full" ? 4 : 0}>
      <Bloom
        ref={bloomRef as never}
        mipmapBlur
        intensity={1.05}
        luminanceThreshold={0.95}
        luminanceSmoothing={0.12}
      />
      {PROFILE.composer === "full" ? (
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.055} />
      ) : (
        <></>
      )}
      <Vignette eskil={false} offset={0.24} darkness={0.78} />
    </EffectComposer>
  );
}
