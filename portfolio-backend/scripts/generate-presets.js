#!/usr/bin/env node
// Pre-generates 30-question quiz presets for the quick-pick cities listed in
// data/quiz-preset-cities.js. Each preset is written to data/quiz-presets/<cityKey>.json.
// Idempotent: skips cities with existing presets unless --force is passed.
//
// Usage:
//   ANTHROPIC_API_KEY=... node scripts/generate-presets.js
//   ANTHROPIC_API_KEY=... node scripts/generate-presets.js --force
//   ANTHROPIC_API_KEY=... node scripts/generate-presets.js --only "Seattle,Austin"

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import {
  generateQuizWithTimeout,
  normalizeCityKey,
  PRESETS_DIR,
  PRESET_TIMEOUT_MS,
} from "../routes/quiz.js";
import { PRESET_CITIES } from "../data/quiz-preset-cities.js";

dotenv.config();

const TARGET_COUNT = 30;
const CANDIDATE_COUNT = 40;
const PER_CATEGORY_CAP = 4; // larger cap so we have variety to sample from

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyArg = args.find((a) => a.startsWith("--only"));
const onlyCities = onlyArg
  ? onlyArg
      .replace(/^--only=?/, "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : null;
const explicitOnly =
  onlyCities ||
  (args.includes("--only")
    ? args.slice(args.indexOf("--only") + 1).filter((a) => !a.startsWith("--"))
    : null);

function shouldRun(city) {
  if (explicitOnly && explicitOnly.length > 0) {
    return explicitOnly.some(
      (c) => normalizeCityKey(c) === normalizeCityKey(city)
    );
  }
  return true;
}

async function generateOne(city) {
  const cityKey = normalizeCityKey(city);
  const outFile = path.join(PRESETS_DIR, `${cityKey}.json`);
  if (!force && fs.existsSync(outFile)) {
    console.log(`⏭️  Skipping ${city} (preset already exists at ${outFile})`);
    return { city, status: "skipped" };
  }

  console.log(`\n🏙️  Generating preset for ${city} (target=${TARGET_COUNT})...`);
  const start = Date.now();
  const data = await generateQuizWithTimeout(
    city,
    {
      targetCount: TARGET_COUNT,
      candidateCount: CANDIDATE_COUNT,
      perCategoryCap: PER_CATEGORY_CAP,
    },
    PRESET_TIMEOUT_MS
  );

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `   ✓ ${data.questions.length} questions in ${elapsed}s — categories:`,
    data.categoryCounts
  );

  const preset = {
    city: data.city,
    cityKey,
    questions: data.questions,
    categoryCounts: data.categoryCounts,
    freshness: data.freshness,
    generatedAt: new Date().toISOString(),
  };

  fs.mkdirSync(PRESETS_DIR, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(preset, null, 2), "utf-8");
  console.log(`   → wrote ${outFile}`);
  return { city, status: "generated", questions: data.questions.length };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY is required.");
    process.exit(1);
  }

  console.log(
    `Generating ${TARGET_COUNT}-question presets for ${PRESET_CITIES.length} cities` +
      (explicitOnly ? ` (filtered: ${explicitOnly.join(", ")})` : "") +
      (force ? " (FORCE)" : "")
  );

  fs.mkdirSync(PRESETS_DIR, { recursive: true });

  const results = [];
  for (const city of PRESET_CITIES) {
    if (!shouldRun(city)) continue;
    try {
      results.push(await generateOne(city));
    } catch (err) {
      console.error(`   ❌ Failed for ${city}:`, err.message);
      results.push({ city, status: "failed", error: err.message });
    }
  }

  console.log("\n=== Summary ===");
  for (const r of results) {
    console.log(
      `${r.status === "generated" ? "✓" : r.status === "skipped" ? "·" : "✗"} ${r.city.padEnd(20)} ${r.status}${r.questions ? ` (${r.questions} q)` : ""}${r.error ? ` — ${r.error}` : ""}`
    );
  }
  const failed = results.filter((r) => r.status === "failed").length;
  process.exit(failed > 0 ? 1 : 0);
}

main();
