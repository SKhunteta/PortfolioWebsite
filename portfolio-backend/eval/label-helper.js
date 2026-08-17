import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import OpenAIService from "../services/openai.js";
import QdrantService from "../services/qdrant.js";

/**
 * Labeling assistant for the golden set. Plumbing only — the judgment calls
 * are yours.
 *
 * For every golden-set question that has no expected_original_ids yet (and
 * isn't a refusal case), this runs the real retrieval path (embed → Qdrant,
 * top 10) and prints what came back: original_id, score, content_type, title,
 * and a content snippet.
 *
 * Your job while reading each result list:
 *   1. Decide which original_ids SHOULD be retrieved for this question —
 *      including ones that did NOT come back (browse data/portfolio.json or
 *      the printed corpus inventory to find them). Copy them into
 *      expected_original_ids in golden-set.jsonl.
 *   2. Write 1-3 expected_facts: short strings a correct answer must contain
 *      (e.g. "300 volunteers", "Navajo Nation"). These power the answer-level
 *      evals in weekend 3.
 *   3. In notes, record anything surprising — a chunk that matched for a bad
 *      reason, a missing chunk, a too-long chunk. These observations are the
 *      write-up.
 *
 * Usage: node eval/label-helper.js            (needs Qdrant + OpenAI creds)
 *        node eval/label-helper.js gs-009     (single question)
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_SET = path.join(HERE, "golden-set.jsonl");
const TOP_K = 10;
const SNIPPET_LEN = 220;

async function loadGoldenSet() {
  const items = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(GOLDEN_SET),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (line.trim()) items.push(JSON.parse(line));
  }
  return items;
}

async function printCorpusInventory() {
  // Everything currently in Qdrant, grouped by content_type, so you can spot
  // chunks that SHOULD have been retrieved but weren't.
  const inventory = new Map();
  let offset = null;
  do {
    const page = await QdrantService.client.scroll(
      QdrantService.collectionName,
      { limit: 100, offset, with_payload: true, with_vector: false }
    );
    for (const point of page.points) {
      const type = point.payload?.content_type ?? "unknown";
      if (!inventory.has(type)) inventory.set(type, []);
      inventory.get(type).push(
        `${point.payload?.original_id} — ${point.payload?.title ?? "(untitled)"}`
      );
    }
    offset = page.next_page_offset;
  } while (offset);

  console.log("=".repeat(72));
  console.log("CORPUS INVENTORY (all original_ids currently in Qdrant)");
  console.log("=".repeat(72));
  for (const [type, ids] of [...inventory.entries()].sort()) {
    console.log(`\n[${type}] (${ids.length})`);
    for (const id of ids.sort()) console.log(`  ${id}`);
  }
  console.log();
}

async function main() {
  const only = process.argv[2] ?? null;
  const items = await loadGoldenSet();

  await printCorpusInventory();

  const pending = items.filter(
    (it) =>
      (only ? it.id === only : true) &&
      !it.expect_refusal &&
      it.expected_original_ids.length === 0
  );

  if (pending.length === 0) {
    console.log(only ? `${only} not found or already labeled.` : "Nothing left to label. 🎉");
    return;
  }

  console.log(`${pending.length} question(s) to label. For each: pick the original_ids that SHOULD be retrieved.\n`);

  for (const item of pending) {
    console.log("=".repeat(72));
    console.log(`${item.id}  [${item.category}]  ${item.question}`);
    if (item.notes) console.log(`notes: ${item.notes}`);
    console.log("-".repeat(72));

    const embedding = await OpenAIService.generateEmbedding(item.question);
    const results = await QdrantService.search(embedding, TOP_K);

    results.forEach((r, i) => {
      const p = r.payload ?? {};
      const snippet = (p.searchable_content ?? p.description ?? "")
        .replace(/\s+/g, " ")
        .slice(0, SNIPPET_LEN);
      console.log(
        `${String(i + 1).padStart(2)}. ${p.original_id}  score=${r.score?.toFixed(3)}  [${p.content_type}]  ${p.title ?? ""}`
      );
      console.log(`      ${snippet}${snippet.length === SNIPPET_LEN ? "…" : ""}`);
    });
    console.log();
  }

  console.log(
    "Now edit eval/golden-set.jsonl: fill expected_original_ids and expected_facts for each question above.\n" +
      "Before you run the eval for the first time, write down your prediction: what recall@5 do you expect, and why?"
  );
}

main().catch((err) => {
  console.error("label-helper failed:", err.message);
  process.exit(1);
});
