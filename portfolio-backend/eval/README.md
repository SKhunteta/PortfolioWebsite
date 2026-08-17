# RAG Eval Harness

Evals for the BuiltByShrey RAG pipeline (`/api/ask` and the `ask_shrey` MCP
tool). The plan: retrieval metrics gating CI, a calibrated LLM-as-judge for
faithfulness, and adversarial regression tests (refusals, prompt injection,
canon spoilers) — validated at the end by deliberate fault injection.

## Division of labor (the rule)

**Plumbing is generated; judgment is hand-written.** The trace logger,
labeling helper, and eval runner are scaffolding. The parts that produce the
learning are deliberately left to a human:

- labeling `golden-set.jsonl` (which chunks SHOULD come back, which facts a
  correct answer must contain)
- implementing `metrics.js` (`recallAtK`, `reciprocalRank`)
- later: the judge rubric, its calibration, and the pass/fail thresholds

## Weekend 1 workflow

1. **Traces are already flowing.** Every `/api/ask` and `ask_shrey` request
   appends a JSONL record to `eval/traces/` (question, retrieved chunk
   original_ids + scores, answer, latency). Disable with `EVAL_TRACING=0`.
   Skim a day's traces; real user questions belong in the golden set.
2. **Label the golden set**: `npm run eval:label` prints the corpus inventory
   plus the top-10 retrieval for every unlabeled question. Fill in
   `expected_original_ids` (stable across reindexes — never Qdrant point ids)
   and 1–3 `expected_facts` per question in `golden-set.jsonl`.
3. **Write your prediction down** (see journal below) — *before* step 5.
4. **Implement `metrics.js`.** ~20 lines each. The edge-case decisions are
   yours; record them here under Design decisions.
5. **Run it**: `npm run eval:retrieval`. Compare against your prediction.
   Investigate every ⚠ row: `npm run eval:label -- gs-010`.
6. **Commit `eval/reports/`** — that's your baseline history.

## The journal (predict-then-measure)

Before every eval run, add one line here or in a `journal.md`:

> `2026-08-23 — expecting recall@5 ≈ 0.8; worried about gs-009/gs-010 because
> healthcare content is spread across chunk types.`

The gap between prediction and result is where your mental model is wrong,
which is exactly what this project is for. The journal is also the first
draft of the blog post.

## Design decisions

(yours — record metric edge-case choices, labeling conventions, surprises)

## Roadmap

- **W2**: baseline report → fix worst retrieval failure → re-measure
- **W3**: faithfulness judge (calibrate against 30 hand labels), refusal
  suite (`expect_refusal` cases), `assess_fit` injection tests, canon-spoiler
  probes
- **W4**: CI gate + nightly judged run, fault-injection validation ("plant 10
  regressions, count catches"), write-up
