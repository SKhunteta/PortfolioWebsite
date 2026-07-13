// Post stack by tier. Phone: nothing — the painted sprite glow carries the
// look. Tablet: bloom + vignette. Desktop adds film grain (which reads as
// paper grain here). Bloom threshold sits AT 1.0 with tight smoothing: the
// bright washi paper (~0.85 luminance) must never catch the skirt — only
// deliberate HDR sources ignite (train cores, dwell pulses), lanterns in
// daylight. The vignette is light plate-wear at the edges, not a tunnel.

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
        luminanceThreshold={1.0}
        luminanceSmoothing={0.08}
      />
      {PROFILE.composer === "full" ? (
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.055} />
      ) : (
        <></>
      )}
      <Vignette eskil={false} offset={0.24} darkness={0.32} />
    </EffectComposer>
  );
}
