import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import OpenAIService from "../services/openai.js";
import QdrantService from "../services/qdrant.js";
import { recallAtK, reciprocalRank } from "./metrics.js";

/**
 * Layer-1 retrieval eval: runs every labeled golden-set question through the
 * real retrieval path and scores it with YOUR metrics from metrics.js.
 *
 * Usage: node eval/run-retrieval-eval.js   (needs Qdrant + OpenAI creds)
 *
 * Prints a per-question table and writes a timestamped report to
 * eval/reports/ — commit those reports; they're your baseline history.
 *
 * No pass/fail threshold yet, on purpose: establish a baseline first, THEN
 * decide the gate (weekend 4). A threshold picked before you've seen real
 * numbers is a guess wearing a suit.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const K = 5;
const RETRIEVE_N = 10; // retrieve deeper than K so MRR can see below the cutoff

async function loadGoldenSet() {
  const items = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(HERE, "golden-set.jsonl")),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (line.trim()) items.push(JSON.parse(line));
  }
  return items;
}

async function main() {
  const items = (await loadGoldenSet()).filter(
    (it) => !it.expect_refusal && it.expected_original_ids.length > 0
  );

  if (items.length === 0) {
    console.log(
      "No labeled questions yet. Run `npm run eval:label`, fill in expected_original_ids in eval/golden-set.jsonl, then re-run."
    );
    return;
  }

  const rows = [];
  for (const item of items) {
    const embedding = await OpenAIService.generateEmbedding(item.question);
    const results = await QdrantService.search(embedding, RETRIEVE_N);
    const retrievedIds = results.map((r) => r.payload?.original_id ?? "∅");

    let recall, rr;
    try {
      recall = recallAtK(item.expected_original_ids, retrievedIds, K);
      rr = reciprocalRank(item.expected_original_ids, retrievedIds);
    } catch (err) {
      console.error(`\n${err.message}`);
      console.error(
        "The runner is done — it stops here until your metrics in eval/metrics.js return real numbers."
      );
      process.exit(1);
    }

    rows.push({
      id: item.id,
      question: item.question,
      expected: item.expected_original_ids,
      retrieved_top_k: retrievedIds.slice(0, K),
      [`recall@${K}`]: recall,
      mrr: rr,
    });
  }

  const mean = (key) =>
    rows.reduce((sum, r) => sum + r[key], 0) / rows.length;

  console.log(`\nRetrieval eval — ${rows.length} labeled questions, k=${K}\n`);
  for (const r of rows) {
    const flag = r[`recall@${K}`] < 1 ? "  ⚠" : "";
    console.log(
      `${r.id}  recall@${K}=${r[`recall@${K}`].toFixed(2)}  mrr=${r.mrr.toFixed(2)}${flag}  ${r.question}`
    );
  }
  console.log(
    `\nMEAN  recall@${K}=${mean(`recall@${K}`).toFixed(3)}  mrr=${mean("mrr").toFixed(3)}`
  );
  console.log(
    "\nBefore reading further: how does this compare to the prediction you wrote down?\nInvestigate every ⚠ row by re-running `npm run eval:label -- <id>` and reading what actually matched."
  );

  const reportsDir = path.join(HERE, "reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  const reportPath = path.join(
    reportsDir,
    `retrieval-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        ts: new Date().toISOString(),
        k: K,
        n_questions: rows.length,
        mean: { [`recall@${K}`]: mean(`recall@${K}`), mrr: mean("mrr") },
        rows,
      },
      null,
      2
    )
  );
  console.log(`\nReport written: ${path.relative(process.cwd(), reportPath)}`);
}

main().catch((err) => {
  console.error("retrieval eval failed:", err.message);
  process.exit(1);
});
