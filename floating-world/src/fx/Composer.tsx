// Post stack by tier. Phone: nothing — the painted sprite glow carries the
// look. Tablet: bloom + vignette. Desktop adds the drifting paper grain
// (PaperGrain.tsx — a static sheet that creeps sub-perceptually, NEVER the
// per-frame-random NoiseEffect, which reads as TV static). Bloom threshold
// sits AT 1.0 with tight smoothing: the bright washi paper (~0.85 luminance)
// must never catch the skirt — only deliberate HDR sources ignite (train
// cores, dwell pulses), lanterns in daylight. The vignette is light
// plate-wear at the edges, not a tunnel.
//
// ?fx=-grain,-bloom,-fxaa,-vignette (or +pass to force one on) bisects the
// chain on real hardware — see world/device.ts. The composer watchdog
// (watchdog.ts) probes the first ~2 s for the known catastrophic signatures,
// then stays armed for the life of the page as a flicker sentinel (transient
// single-frame blackouts — the Jul 16 iPad/desktop strobe), and falls back
// to composer off if this chain ever breaks a real GPU again.

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, FXAA } from "@react-three/postprocessing";
import { KernelSize } from "postprocessing";
import type { EffectComposer as EffectComposerImpl } from "postprocessing";
import { HalfFloatType } from "three";
import { PROFILE, fxEnabled } from "../world/device";
import { LIVE } from "../world/palettes";
import { useUi } from "../trains/store";
import { PaperGrain } from "./PaperGrain";
import { armComposerWatchdog } from "./watchdog";

export function Composer() {
  const bloomRef = useRef<{ intensity: number } | null>(null);
  const composerRef = useRef<EffectComposerImpl>(null);
  const gl = useThree((s) => s.gl);
  const fallback = useUi((s) => s.composerFallback);

  useFrame(() => {
    if (bloomRef.current) bloomRef.current.intensity = LIVE.bloomIntensity;
  });

  useEffect(() => {
    if (fallback || !composerRef.current) return;
    armComposerWatchdog(composerRef.current, gl.getContext(), (reason) =>
      useUi.getState().setComposerFallback(reason)
    );
  }, [gl, fallback]);

  // The watchdog fallback unmounts the whole stack: R3F's auto-render takes
  // back over (the composer's priority-1 loop is gone) and the piece renders
  // the way phones always have.
  if (PROFILE.composer === "off" || fallback) return null;

  const full = PROFILE.composer === "full";
  const passes = {
    fxaa: fxEnabled("fxaa", true),
    bloom: fxEnabled("bloom", true),
    grain: fxEnabled("grain", full),
    vignette: fxEnabled("vignette", true),
  };
  // All passes bisected away == composer off; don't mount an empty pass.
  if (!passes.fxaa && !passes.bloom && !passes.grain && !passes.vignette) return null;

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
  // Bloom uses the KAWASE blur path, NEVER mipmapBlur — the third member of
  // the same Apple-GPU family. The mipmap-chain blur intermittently presented
  // single all-black or half-black frames on iPad AND Apple-silicon desktop
  // (Safari and Chrome alike — the shared Metal driver, not the browser),
  // roughly every few seconds, one frame long. Field-bisected on a real iPad
  // (Jul 17): ?fx=-bloom stopped it cold with FXAA + vignette still mounted,
  // and the flicker watchdog's black-flicker trips confirmed the cadence.
  // SwiftShader, as always with this family, saw nothing.
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
  return (
    <EffectComposer ref={composerRef} multisampling={0} frameBufferType={HalfFloatType}>
      {passes.fxaa ? <FXAA /> : <></>}
      {passes.bloom ? (
        <Bloom
          ref={bloomRef as never}
          mipmapBlur={false}
          kernelSize={KernelSize.LARGE}
          intensity={1.05}
          luminanceThreshold={1.0}
          luminanceSmoothing={0.08}
        />
      ) : (
        <></>
      )}
      {passes.grain ? <PaperGrain /> : <></>}
      {passes.vignette ? <Vignette eskil={false} offset={0.24} darkness={0.32} /> : <></>}
    </EffectComposer>
  );
}
