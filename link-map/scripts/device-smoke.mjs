#!/usr/bin/env node
// Per-tier smoke harness for The Link, Alive (playwright-core, chromium at
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
    await page.evaluate(() => (window).__linkMap.follow(0));
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(SHOTS, "desktop-chase.png") });
    await page.evaluate(() => {
      (window).__linkMap.release();
      (window).__linkMap.setPhase(1);
    });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(SHOTS, "desktop-day.png") });
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
