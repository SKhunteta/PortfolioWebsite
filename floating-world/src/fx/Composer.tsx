// Post stack by tier. Phone: nothing — the painted sprite glow carries the
// look. Tablet: bloom + vignette. Desktop adds film grain (which reads as
// paper grain here). Bloom threshold sits AT 1.0 with tight smoothing: the
// bright washi paper (~0.85 luminance) must never catch the skirt — only
// deliberate HDR sources ignite (train cores, dwell pulses), lanterns in
// daylight. The vignette is light plate-wear at the edges, not a tunnel.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, Noise, SMAA } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { HalfFloatType } from "three";
import { PROFILE } from "../world/device";
import { LIVE } from "../world/palettes";

export function Composer() {
  const bloomRef = useRef<{ intensity: number } | null>(null);

  useFrame(() => {
    if (bloomRef.current) bloomRef.current.intensity = LIVE.bloomIntensity;
  });

  if (PROFILE.composer === "off") return null;

  // Half-float buffer so the painted-HDR sources (train cores ~2.6) survive to
  // the bloom pass and the transparent washi grade presents correctly — a byte
  // buffer crushes this scene to black. Desktop antialiases with SMAA and drops
  // MSAA (multisampling 0): an MSAA byte/HDR render target composites this
  // all-transparent scene to black, so the crisp sumi edges come from SMAA
  // instead. Tablet keeps MSAA 4×. Mirrors the working meow-9/ketu-9 stacks.
  const full = PROFILE.composer === "full";

  return (
    <EffectComposer multisampling={full ? 0 : 4} frameBufferType={HalfFloatType}>
      {full ? <SMAA /> : <></>}
      <Bloom
        ref={bloomRef as never}
        mipmapBlur
        intensity={1.05}
        luminanceThreshold={1.0}
        luminanceSmoothing={0.08}
      />
      {full ? (
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.055} />
      ) : (
        <></>
      )}
      <Vignette eskil={false} offset={0.24} darkness={0.32} />
    </EffectComposer>
  );
}
