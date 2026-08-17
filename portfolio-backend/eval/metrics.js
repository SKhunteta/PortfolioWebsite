/**
 * Retrieval metrics — YOURS TO IMPLEMENT.
 *
 * This file is deliberately left as stubs. Writing these ~20-line functions
 * yourself (and deciding the edge-case semantics) is the point of the
 * exercise; the runner (run-retrieval-eval.js) will work as soon as they
 * return real numbers.
 *
 * Both functions take arrays of stable chunk ids (payload.original_id):
 *   expectedIds  — what you labeled in golden-set.jsonl
 *   retrievedIds — what Qdrant returned, in rank order (best first)
 *
 * Questions you'll have to answer for yourself along the way (these ARE the
 * learning — note your decisions in the README's design-decisions section):
 *   - recall@k with multiple expected ids: is it fraction-found-in-top-k, or
 *     all-or-nothing? (Convention: fraction. But decide and document.)
 *   - what should recall@k return when expectedIds is empty?
 *   - MRR: rank of the FIRST relevant hit — 1-indexed. What if nothing hits?
 */

/**
 * Fraction of expectedIds that appear in the first k retrievedIds.
 * @param {string[]} expectedIds
 * @param {string[]} retrievedIds - rank order, best first
 * @param {number} k
 * @returns {number} 0..1
 */
export function recallAtK(expectedIds, retrievedIds, k) {
  throw new Error("recallAtK is yours to implement — see eval/README.md");
}

/**
 * Reciprocal rank of the first expected id found in retrievedIds (1-indexed):
 * 1 if the top hit is relevant, 0.5 if the first relevant hit is at rank 2, …
 * @param {string[]} expectedIds
 * @param {string[]} retrievedIds - rank order, best first
 * @returns {number} 0..1
 */
export function reciprocalRank(expectedIds, retrievedIds) {
  throw new Error("reciprocalRank is yours to implement — see eval/README.md");
}
