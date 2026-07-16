#!/usr/bin/env node
// Per-tier smoke harness for The Living Link (playwright-core, chromium at
// /opt/pw-browsers/chromium — the meow-9 pattern).
//
// For each device tier it boots the dev server's page, waits for the canvas
// and for trains to arrive (the local backend must be running — keyless is
// fine, simulated mode is a first-class citizen), asserts the mode badge,
// measures fps from __linkMapStats, and screenshots night + day looks into
// scripts/shots/.
//
// FPS gate: hard >= 55 on a real GPU; software GL (SwiftShader/llvmpipe)
// can't hit that, so there it only warns below 2 — the 55 fps bar is the
// real-hardware acceptance criterion.
//
// Usage:  node scripts/device-smoke.mjs [--url http://localhost:5199]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "scripts", "shots");
const urlArg = process.argv.indexOf("--url");
const BASE = urlArg >= 0 ? process.argv[urlArg + 1] : "http://localhost:5199";

const TIERS = [
  { tier: "phone", viewport: { width: 390, height: 844 } },
  { tier: "tablet", viewport: { width: 1024, height: 768 } },
  { tier: "desktop", viewport: { width: 1440, height: 900 } },
];

const VALID_MODES = new Set(["live", "simulated", "resting"]);

fs.mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-angle=swiftshader", "--no-sandbox"],
});

let failed = false;

for (const { tier, viewport } of TIERS) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Chromium surfaces app-visible GL errors on the console ("WebGL:
  // INVALID_OPERATION: …", then "too many errors"). SwiftShader raises
  // GL_INVALID_OPERATION for the same-image-blit class of bug (the SMAA
  // depth-copy feedback, PR #216) even though it can't reproduce the MSAA
  // blackouts — so this catches the reproducible half of the failure
  // taxonomy headlessly.
  const glErrors = [];
  page.on("console", (m) => {
    const text = m.text();
    if (/WebGL: (INVALID_|too many errors)|GL_INVALID|GL ERROR/i.test(text)) glErrors.push(text);
  });

  const url = `${BASE}/?phase=night&tier=${tier}&debug`;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { timeout: 20_000 });

  // Wait for the poller to land its first fleet (simulated counts).
  await page
    .waitForFunction(() => (window).__linkMapStats?.trains > 0, null, { timeout: 30_000 })
    .catch(() => {});

  // Let trails develop and the fps window settle.
  await page.waitForTimeout(tier === "desktop" ? 25_000 : 10_000);

  const stats = await page.evaluate(() => (window).__linkMapStats);
  const gpu = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "unknown";
  });
  const softwareGl = /swiftshader|llvmpipe|software/i.test(String(gpu));

  const badge = await page.textContent(".hud-badge").catch(() => null);
  const night = path.join(SHOTS, `${tier}-night.png`);
  await page.screenshot({ path: night });

  let problems = [];
  if (!stats) problems.push("no __linkMapStats");
  if (stats && stats.tier !== tier) problems.push(`tier ${stats.tier} != ${tier}`);
  if (stats && !(stats.trains > 0)) problems.push("no trains on the map");
  if (stats && !VALID_MODES.has(stats.mode)) problems.push(`mode "${stats.mode}" never resolved`);
  if (!badge || !badge.trim()) problems.push("mode badge missing");
  if (errors.length) problems.push(`page errors: ${errors[0]}`);
  if (glErrors.length) problems.push(`WebGL errors: ${glErrors.length} (first: ${glErrors[0]})`);

  // The in-app composer watchdog (src/fx/watchdog.ts) counted GL errors and
  // black-frame probes in-frame during the first ~2 s — a second channel that
  // works even where the console heuristic misses. Any nonzero count on a
  // healthy build is a regression.
  const wd = stats?.watchdog;
  const expectedComposer = { phone: "off", tablet: "lite", desktop: "full" }[tier];
  if (stats && stats.composer !== expectedComposer)
    problems.push(`composer "${stats.composer}" != "${expectedComposer}" (watchdog fallback?)`);
  if (wd?.tripped) problems.push(`composer watchdog tripped: ${wd.tripped}`);
  if (wd && wd.glErrorFrames > 0)
    problems.push(`${wd.glErrorFrames} probed frames saw gl.getError() != NO_ERROR`);
  if (wd && wd.blackFrames > 0)
    problems.push(`${wd.blackFrames} consecutive all-black frames probed`);

  const fps = stats?.fps ?? 0;
  if (softwareGl) {
    // Software GL renders the watercolor shaders on the CPU — fps here is
    // informational only; anything that still produces frames passes.
    if (fps < 0.5) problems.push(`fps ${fps.toFixed(2)} — not rendering at all?`);
  } else if (fps < 55) {
    problems.push(`fps ${fps.toFixed(1)} < 55 on real GPU`);
  }

  // Desktop also exercises chase view and the day palette.
  if (tier === "desktop") {
    // Grain-stillness proxy for the flicker class only real-desktop eyes
    // caught: two screenshots ~0.5 s apart on the SETTLED night view (before
    // the chase/day exercises — a mid-lerp palette transition changes every
    // pixel and false-warns). The old per-frame-random NoiseEffect re-rolled
    // EVERY pixel between any two frames (~100% diff); the drifting
    // PaperGrain moves ~0.2 px/s, so only genuinely animated pixels (water
    // thread, trains, kasumi) should change — measured ~33% here, identical
    // with the grain pass bisected off. Decode both PNGs in the page
    // (compositor capture works regardless of preserveDrawingBuffer) and
    // count changed pixels. Warn-only: the scene legitimately animates, this
    // flags an order-of-magnitude regression.
    const shotA = (await page.screenshot()).toString("base64");
    await page.waitForTimeout(500);
    const shotB = (await page.screenshot()).toString("base64");
    const changedFrac = await page.evaluate(async ([b64a, b64b]) => {
      const decode = (b64) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const c = document.createElement("canvas");
            c.width = img.width;
            c.height = img.height;
            const ctx = c.getContext("2d");
            ctx.drawImage(img, 0, 0);
            resolve(ctx.getImageData(0, 0, img.width, img.height).data);
          };
          img.src = `data:image/png;base64,${b64}`;
        });
      const [a, b] = await Promise.all([decode(b64a), decode(b64b)]);
      let changed = 0;
      let total = 0;
      for (let i = 0; i < a.length; i += 16) {
        // every 4th pixel
        total++;
        if (
          Math.abs(a[i] - b[i]) > 6 ||
          Math.abs(a[i + 1] - b[i + 1]) > 6 ||
          Math.abs(a[i + 2] - b[i + 2]) > 6
        )
          changed++;
      }
      return changed / total;
    }, [shotA, shotB]);
    if (changedFrac > 0.7)
      console.warn(
        `⚠ desktop: ${(changedFrac * 100).toFixed(1)}% of pixels changed across 0.5 s — full-frame churn is the per-frame-random-grain signature (warn-only; water/trains animate)`
      );

    await page.evaluate(() => (window).__linkMap.follow(0));
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(SHOTS, "desktop-chase.png") });
    await page.evaluate(() => {
      (window).__linkMap.release();
      (window).__linkMap.setPhase(1);
    });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(SHOTS, "desktop-day.png") });

    // Guard the ?fx= bisect plumbing itself: a -grain reload must still paint.
    await page.goto(`${BASE}/?phase=night&tier=desktop&debug&fx=-grain`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector("canvas", { timeout: 20_000 });
    await page.waitForTimeout(4000);
    const fxStats = await page.evaluate(() => (window).__linkMapStats);
    if (!fxStats || !(fxStats.fps > 0)) problems.push("?fx=-grain reload did not render");
  }

  const fpsNote = softwareGl ? `${fps.toFixed(1)} (software GL — informational)` : fps.toFixed(1);
  if (problems.length) {
    failed = true;
    console.error(`✗ ${tier}: ${problems.join("; ")} [fps ${fpsNote}, gpu: ${gpu}]`);
  } else {
    console.log(
      `✓ ${tier}: mode=${stats.mode} trains=${stats.trains} fps=${fpsNote} badge="${badge.trim()}"`
    );
  }
  await page.close();
}

await browser.close();
process.exit(failed ? 1 : 0);
