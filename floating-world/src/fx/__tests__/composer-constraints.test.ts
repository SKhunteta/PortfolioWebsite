// Load-bearing composer constraints. Sound & Rail spent five PRs
// (#192/#197/#198/#216/#218) oscillating between "totally black on real
// desktops" (every MSAA config) and "flickering" (SMAA's DEPTH-attribute
// depth-copy feedback in three r162+, then NoiseEffect's per-frame random) —
// and headless SwiftShader passed every broken config. These tests pin the
// constraints in CI so no future session re-walks into them. If one fails,
// read the comment block in Composer.tsx before "fixing" the test.

import { readFileSync } from "node:fs";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { EffectAttribute, BloomEffect, FXAAEffect, VignetteEffect } from "postprocessing";
import { PaperGrainEffect, GRAIN_DRIFT_X, GRAIN_DRIFT_Y } from "../PaperGrain";
import { CLOCK, tickClock } from "../../world/clock";

const COMPOSER_SRC = readFileSync(new URL("../Composer.tsx", import.meta.url), "utf8");

describe("load-bearing composer constraints", () => {
  it("multisampling is literally 0 — every MSAA config black-screened real GPUs", () => {
    expect(COMPOSER_SRC).toMatch(/multisampling=\{0\}/);
    expect(COMPOSER_SRC).not.toMatch(/multisampling=\{[1-9]/);
  });

  it("the buffer stays HalfFloat — a byte buffer crushes the painted-HDR scene to black", () => {
    expect(COMPOSER_SRC).toMatch(/frameBufferType=\{HalfFloatType\}/);
  });

  it("bloom never uses mipmapBlur — the mip-chain blur strobed single black frames on Apple GPUs", () => {
    // Field-bisected on a real iPad (Jul 17, ?fx=-bloom) after the flicker
    // watchdog's black-flicker trips flagged it: one-frame all/half-black
    // presents every few seconds, identical in Safari and Chrome (the shared
    // Metal driver), invisible on SwiftShader like the rest of the family.
    // The Kawase path (mipmapBlur={false} + kernelSize) is the stable blur.
    // The prose above may name the banned prop; the JSX may not use it bare.
    expect(COMPOSER_SRC).toMatch(/<Bloom[\s\S]*?mipmapBlur=\{false\}[\s\S]*?kernelSize=/);
    expect(COMPOSER_SRC).not.toMatch(/<Bloom[\s\S]*?mipmapBlur(?!=\{false\})/);
  });

  it("SMAA never returns — its DEPTH attribute arms the broken stable-depth copy", () => {
    // The comment block may (should) explain the ban; imports and JSX may not.
    expect(COMPOSER_SRC).not.toMatch(/import[^;]*\bSMAA\b/);
    expect(COMPOSER_SRC).not.toMatch(/<SMAA/);
  });

  it("the per-frame-random NoiseEffect never returns — it reads as TV static", () => {
    expect(COMPOSER_SRC).not.toMatch(/import[^;]*\bNoise\b/);
    expect(COMPOSER_SRC).not.toMatch(/<Noise[\s/>]/);
  });

  it("no effect in the chain declares EffectAttribute.DEPTH", () => {
    // The DEPTH attribute is what arms the composer's stable-depth copy — the
    // clone()d depth texture shares its GL image in three r162+, so the
    // per-frame blit reads and writes the same image (GL_INVALID_OPERATION on
    // real GPUs, silence on SwiftShader). Instantiate the actual chain.
    const chain = [new FXAAEffect(), new BloomEffect(), new PaperGrainEffect(), new VignetteEffect()];
    for (const effect of chain) {
      expect(effect.getAttributes() & EffectAttribute.DEPTH).toBe(0);
      effect.dispose();
    }
  });
});

describe("paper grain (canon: drifts sub-perceptually, never re-randomizes)", () => {
  let savedT: number;
  beforeEach(() => (savedT = CLOCK.t));
  afterEach(() => (CLOCK.t = savedT));

  it("drift rates stay under 0.5 grain-texels per second (sub-perceptual)", () => {
    expect(GRAIN_DRIFT_X * 256).toBeLessThan(0.5);
    expect(GRAIN_DRIFT_Y * 256).toBeLessThan(0.5);
    expect(GRAIN_DRIFT_X).toBeGreaterThan(0); // still alive — canon wants a breathing sheet
    expect(GRAIN_DRIFT_Y).toBeGreaterThan(0);
  });

  it("drift follows the one clock", () => {
    const effect = new PaperGrainEffect();
    const drift = effect.uniforms.get("drift")!.value as { x: number; y: number; clone(): unknown };

    effect.update(null as never, null as never, 0.016);
    const x0 = drift.x;
    const y0 = drift.y;

    for (let i = 0; i < 10; i++) tickClock(0.1); // one integrated second
    effect.update(null as never, null as never, 0.016);

    expect(drift.x).not.toBe(x0); // moved with the clock…
    expect(drift.y).not.toBe(y0);
    expect(Math.abs(drift.x - x0) * 256).toBeLessThan(0.5); // …but under a texel-half per second
    expect(Math.abs(drift.y - y0) * 256).toBeLessThan(0.5);
    effect.dispose();
  });

  it("the grain sheet is deterministic — same seed, same paper every boot", () => {
    const a = new PaperGrainEffect();
    const b = new PaperGrainEffect();
    const texA = a.uniforms.get("grainTex")!.value as { image: { data: Uint8Array } };
    const texB = b.uniforms.get("grainTex")!.value as { image: { data: Uint8Array } };
    expect(texA.image.data).toEqual(texB.image.data);
    a.dispose();
    b.dispose();
  });
});

describe("device tiering contract", () => {
  const DEVICE_SRC = readFileSync(
    new URL("../../world/device.ts", import.meta.url),
    "utf8"
  );

  it("composer stacks stay off/lite/full per tier, decided in device.ts", () => {
    expect(DEVICE_SRC).toMatch(/composer: "off"/);
    expect(DEVICE_SRC).toMatch(/composer: "lite"/);
    expect(DEVICE_SRC).toMatch(/composer: "full"/);
  });

  it("the stale-MSAA comment never returns — comments must not re-teach MSAA", () => {
    expect(DEVICE_SRC).not.toMatch(/MSAA/);
  });
});
