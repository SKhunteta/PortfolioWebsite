import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Append-only JSONL trace log for RAG requests.
 *
 * Every /api/ask request and ask_shrey MCP call records: the question, which
 * chunks were retrieved (by stable original_id, with scores), and the final
 * answer. Traces are the raw material for golden-set labeling and for
 * debugging eval failures — a failing eval case with no trace is unfixable.
 *
 * Fire-and-forget by design: logging must never break or slow a request.
 * Disable with EVAL_TRACING=0.
 */

const TRACES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "traces"
);

let dirReady = false;

function ensureDir() {
  if (!dirReady) {
    fs.mkdirSync(TRACES_DIR, { recursive: true });
    dirReady = true;
  }
}

/**
 * Reduce a raw Qdrant search result to the fields evals care about.
 * original_id is the stable identifier (point ids are regenerated UUIDs on
 * every reindex, so they must never appear in traces or golden-set labels).
 */
export function summarizeRetrieval(searchResults) {
  return (searchResults || []).map((r) => ({
    original_id: r.payload?.original_id ?? null,
    content_type: r.payload?.content_type ?? null,
    title: r.payload?.title ?? null,
    score: typeof r.score === "number" ? Number(r.score.toFixed(4)) : null,
  }));
}

/**
 * @param {object} trace
 * @param {string} trace.source - "api_ask" | "mcp_ask_shrey"
 * @param {string} trace.question
 * @param {Array} trace.searchResults - raw Qdrant results (summarized here)
 * @param {string} trace.answer
 * @param {number} [trace.latencyMs]
 */
export function logTrace({ source, question, searchResults, answer, latencyMs }) {
  if (process.env.EVAL_TRACING === "0") return;
  try {
    ensureDir();
    const record = {
      ts: new Date().toISOString(),
      source,
      question,
      retrieved: summarizeRetrieval(searchResults),
      answer,
      latency_ms: latencyMs ?? null,
    };
    const file = path.join(
      TRACES_DIR,
      `${new Date().toISOString().slice(0, 10)}.jsonl`
    );
    fs.appendFile(file, JSON.stringify(record) + "\n", (err) => {
      if (err) console.error("Trace logging failed (request unaffected):", err.message);
    });
  } catch (err) {
    console.error("Trace logging failed (request unaffected):", err.message);
  }
}
