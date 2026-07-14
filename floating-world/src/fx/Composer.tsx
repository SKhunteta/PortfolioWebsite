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
  // buffer crushes this scene to black (the original black-desktop bug was MSAA
  // on the DEFAULT byte buffer, not MSAA itself). With HalfFloat, MSAA 4× is
  // stable on every tier — the same path the tablet tier and the link-map
  // sibling ship. An earlier fix swapped desktop to SMAA (multisampling 0), but
  // SMAA's luma edge detection on this HDR buffer of painted-HDR sources and
  // thin drifting sumi strokes classifies edges differently frame-to-frame and
  // shimmers, so the crisp print flickered on desktop. Keep MSAA everywhere;
  // desktop only adds the film-grain pass on top.
  const full = PROFILE.composer === "full";

  return (
    <EffectComposer multisampling={4} frameBufferType={HalfFloatType}>
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
