// The paper's tooth. Replaces postprocessing's NoiseEffect — whose fragment
// hashes uv*(1.0+time), i.e. a brand-new random value per pixel per frame:
// TV static, the desktop flicker — with a static tileable grain sheet whose
// UV offset drifts sub-perceptually off the shared clock, so the washi is
// alive without shimmering (CLAUDE.md: grain "drifts sub-perceptually so the
// sheet itself is alive"). Blend recipe is byte-for-byte the old pass —
// premultiplied by the scene color, SCREEN, opacity 0.055 — the only change
// is static-that-creeps instead of re-random at 60 Hz.

import { forwardRef, useEffect, useMemo } from "react";
import { BlendFunction, Effect } from "postprocessing";
import {
  DataTexture,
  LinearFilter,
  RepeatWrapping,
  RGBAFormat,
  Uniform,
  Vector2,
} from "three";
import type { WebGLRenderer, WebGLRenderTarget } from "three";
import { CLOCK } from "../world/clock";

const GRAIN_TEX_SIZE = 256;

// Drift in grain-texture UV per second. At native texel scale that is
// speed × GRAIN_TEX_SIZE screen px/s — both axes stay well under 0.5 px/s
// (sub-perceptual), and the two rates are incommensurate so the wrap never
// reads as a cycle.
export const GRAIN_DRIFT_X = 0.0008; // ≈0.20 px/s
export const GRAIN_DRIFT_Y = 0.00053; // ≈0.14 px/s

// Deterministic LCG — the same grain sheet every boot, so screenshots diff
// clean and the vitest suite can assert on it.
function makeGrainTexture(): DataTexture {
  let s = 0x9e3779b9;
  const rand = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const data = new Uint8Array(GRAIN_TEX_SIZE * GRAIN_TEX_SIZE * 4);
  for (let i = 0; i < data.length; i += 4) {
    const v = (rand() * 256) | 0;
    data[i] = data[i + 1] = data[i + 2] = v;
    data[i + 3] = 255;
  }
  const tex = new DataTexture(data, GRAIN_TEX_SIZE, GRAIN_TEX_SIZE, RGBAFormat);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

const FRAG = /* glsl */ `
  uniform sampler2D grainTex;
  uniform vec2 texelScale; // buffer resolution / grain texture size
  uniform vec2 drift;      // slow uv offset; RepeatWrapping tiles it

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 grain = vec3(texture2D(grainTex, uv * texelScale + drift).r);
    // NoiseEffect's PREMULTIPLY path, verbatim: multiply by the scene color
    // (clamped) so the SCREEN blend never lifts true blacks past the print.
    outputColor = vec4(min(inputColor.rgb * grain, vec3(1.0)), inputColor.a);
  }`;

export class PaperGrainEffect extends Effect {
  constructor() {
    super("PaperGrainEffect", FRAG, {
      blendFunction: BlendFunction.SCREEN,
      uniforms: new Map<string, Uniform>([
        ["grainTex", new Uniform(makeGrainTexture())],
        ["texelScale", new Uniform(new Vector2(1, 1))],
        ["drift", new Uniform(new Vector2(0, 0))],
      ]),
    });
    this.blendMode.opacity.value = 0.055;
  }

  // EffectPass calls this every frame — no extra useFrame, no priorities
  // (canon). Reading CLOCK keeps the drift on the one clock, so it pauses
  // with the piece when the tab hides instead of jumping on resume.
  override update(_renderer: WebGLRenderer, _inputBuffer: WebGLRenderTarget, _deltaTime?: number) {
    const drift = this.uniforms.get("drift")!.value as Vector2;
    drift.set((CLOCK.t * GRAIN_DRIFT_X) % 1, (CLOCK.t * GRAIN_DRIFT_Y) % 1);
  }

  // EffectPass reports the composer buffer size in device pixels — keep the
  // grain at native texel scale so it stays paper-fine at any dpr.
  override setSize(width: number, height: number) {
    const scale = this.uniforms.get("texelScale")!.value as Vector2;
    scale.set(width / GRAIN_TEX_SIZE, height / GRAIN_TEX_SIZE);
  }

  override dispose() {
    (this.uniforms.get("grainTex")!.value as DataTexture).dispose();
    super.dispose();
  }
}

export const PaperGrain = forwardRef<PaperGrainEffect>(function PaperGrain(_props, ref) {
  const effect = useMemo(() => new PaperGrainEffect(), []);
  useEffect(() => () => effect.dispose(), [effect]);
  return <primitive ref={ref} object={effect} dispose={null} />;
});
