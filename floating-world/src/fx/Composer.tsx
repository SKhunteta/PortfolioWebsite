// Post stack by tier. Phone: nothing — the painted sprite glow carries the
// look. Tablet: bloom + vignette. Desktop adds film grain (which reads as
// paper grain here). Bloom threshold sits AT 1.0 with tight smoothing: the
// bright washi paper (~0.85 luminance) must never catch the skirt — only
// deliberate HDR sources ignite (train cores, dwell pulses), lanterns in
// daylight. The vignette is light plate-wear at the edges, not a tunnel.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, Noise, FXAA } from "@react-three/postprocessing";
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
  // buffer crushes this scene to black.
  //
  // multisampling MUST stay 0 on EVERY tier — this is load-bearing, not a
  // preference. Each MSAA config has rendered real GPUs totally black while
  // headless SwiftShader verification kept passing: desktop on the byte
  // buffer (PR #192), desktop on half-float (PR #198), and the tablet tier's
  // MSAA 4× on a real iPad (user screenshot, Jul 16 — HUD and HDR train
  // cores over a black page, the classic signature). Antialiasing comes from
  // FXAA instead, on both composer tiers.
  //
  // FXAA, NOT SMAA: SMAAEffect declares EffectAttribute.DEPTH, which makes
  // the composer spin up its stable-depth copy — the depth texture is
  // clone()d, and in three r162+ a clone shares the same GL image via
  // .source, so the per-frame depth blit reads and writes the SAME image:
  // GL_INVALID_OPERATION every frame, leaving the copy as undefined memory
  // on real GPUs (SwiftShader's stable zeros hid that too). SMAA's
  // multi-pass luma edge classification also flickers on this HDR buffer of
  // drifting sumi strokes (PR #197). FXAA declares no DEPTH attribute and
  // its single-pass luma AA is temporally soft, so the print holds still.
  const full = PROFILE.composer === "full";

  return (
    <EffectComposer multisampling={0} frameBufferType={HalfFloatType}>
      <FXAA />
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
