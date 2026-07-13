#!/usr/bin/env node
/**
 * Spoiler guard for "The Happiness Liability" canon.
 *
 * Scans everything that feeds prompts, the vector index, or public discovery
 * for terms from the hard-exclusion list in
 * data/HAPPINESS-LIABILITY-SPOILER-POLICY.md. Exits nonzero on any hit.
 *
 * Run from anywhere: node portfolio-backend/scripts/check-canon-spoilers.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..");
const repoRoot = path.join(backendRoot, "..");

// Specific, low-false-positive markers only. Generic words that overlap the
// exclusion list (e.g. "brownout" as a grid term) are a manual-review item —
// see the policy doc.
const FORBIDDEN = [
  "Zara",
  "Krishnamurthy",
  "bird sanctuary",
  "David Chang",
  "Omelas",
  "Veladora",
  "Blue Dream",
];

const TARGETS = [
  path.join(backendRoot, "data", "happiness-liability-canon.json"),
  path.join(backendRoot, "data", "portfolio.json"),
  path.join(backendRoot, "routes"),
  path.join(repoRoot, "public"),
];

const TEXT_EXTENSIONS = new Set([
  ".js", ".json", ".md", ".txt", ".html", ".xml", ".css", ".svg", ".webmanifest",
]);

function* walk(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    yield target;
    return;
  }
  for (const entry of fs.readdirSync(target)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    yield* walk(path.join(target, entry));
  }
}

let hits = 0;
for (const target of TARGETS) {
  if (!fs.existsSync(target)) {
    console.warn(`skip (missing): ${target}`);
    continue;
  }
  for (const file of walk(target)) {
    if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");
    for (const term of FORBIDDEN) {
      const needle = term.toLowerCase();
      lines.forEach((line, i) => {
        if (line.toLowerCase().includes(needle)) {
          hits++;
          console.error(
            `SPOILER: "${term}" in ${path.relative(repoRoot, file)}:${i + 1}`
          );
        }
      });
    }
  }
}

if (hits > 0) {
  console.error(`\n${hits} spoiler hit(s). See data/HAPPINESS-LIABILITY-SPOILER-POLICY.md.`);
  process.exit(1);
}
console.log("Spoiler check passed: no excluded terms in canon, prompts, or public data.");
