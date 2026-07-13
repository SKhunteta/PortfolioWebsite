import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Shared canon for "The Happiness Liability" world.
 *
 * Single source of truth consumed by:
 *  - the Qdrant indexer (buildCanonDocuments → content_type "happiness_liability")
 *  - the MCP explore_happiness_liability tool (buildWorldContext + SPOILER_GUARDRAIL)
 *  - the experiment routes janet.js / ele.js / invoice.js (buildWorldContext)
 *
 * Edit data/happiness-liability-canon.json to change the world; read
 * data/HAPPINESS-LIABILITY-SPOILER-POLICY.md before adding anything.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const canonPath = path.join(__dirname, "../data/happiness-liability-canon.json");

// Loaded synchronously at module init: consumers build system prompts as
// top-level constants. The file is a few KB; a malformed file should fail
// loudly at boot rather than silently at request time.
const canon = JSON.parse(fs.readFileSync(canonPath, "utf-8"));

/**
 * Shared, name-free spoiler instruction. Appended to any prompt that can
 * talk about the novel. Deliberately contains no plot specifics.
 */
export const SPOILER_GUARDRAIL =
  "The full novel is unpublished. Discuss only the world, its history, its institutions, and the story's opening setup. " +
  "Do not reveal, invent, or speculate about plot events, character developments, or outcomes beyond the novel's opening chapter. " +
  "If asked what happens later, say warmly that the book isn't out yet and steer back to the world itself.";

export function getCanon() {
  return canon;
}

/** First sentence of a summary, for compact prompt injection. */
function brief(text) {
  const match = text.match(/^.*?[.!?](?=\s|$)/s);
  return match ? match[0] : text;
}

/**
 * Build a fact block for prompt injection.
 *
 * @param {object} [options]
 * @param {string[]} [options.sections] - Which sections to include, any of:
 *   "overview", "world_rules", "timeline", "institutions", "technology",
 *   "economics", "characters", "experiments". Defaults to the core world
 *   sections (overview, world_rules, timeline, institutions, technology).
 * @param {boolean} [options.compact] - Trim each entry to its first sentence
 *   (~a third of the size). Use inside system prompts; full entries are for
 *   retrieval documents.
 * @returns {string} formatted plain-text context block
 */
export function buildWorldContext({ sections, compact = false } = {}) {
  const include = new Set(
    sections || ["overview", "world_rules", "timeline", "institutions", "technology"]
  );
  const detail = compact ? brief : (s) => s;
  const parts = [];

  if (include.has("overview")) {
    parts.push(
      `"${canon.meta.title}" is a ${canon.meta.form} by ${canon.meta.author} ` +
        `(${canon.meta.structure.toLowerCase()}; ${canon.meta.status.toLowerCase()}), set in the ${canon.meta.setting}.`,
      `Logline: ${canon.logline}`
    );
  }

  if (include.has("world_rules")) {
    parts.push(
      "Rules of the world:",
      ...canon.world_rules.map((r) => `- ${r.name}: ${detail(r.summary)}`)
    );
  }

  if (include.has("timeline")) {
    parts.push(
      "Timeline (2026–2047):",
      ...canon.timeline.map((t) => `- ${t.period} — ${t.title}: ${detail(t.summary)}`)
    );
  }

  if (include.has("institutions")) {
    parts.push(
      "Institutions:",
      ...canon.institutions.map((i) => `- ${i.name}: ${detail(i.summary)}`)
    );
  }

  if (include.has("technology")) {
    parts.push(
      "Technology:",
      ...canon.technology.map((t) => `- ${t.name}: ${detail(t.summary)}`)
    );
  }

  if (include.has("economics")) {
    parts.push(
      "Economics:",
      `- Market logic: ${detail(canon.economics.market_logic)}`,
      `- Contracts: ${detail(canon.economics.contract_economics)}`,
      `- Contamination: ${detail(canon.economics.contamination_risk)}`,
      `- Scale: ${canon.economics.scale}`
    );
  }

  if (include.has("characters")) {
    parts.push(
      "Characters (opening-chapter setup only):",
      ...canon.characters.map((c) => `- ${c.name}: ${detail(c.summary)}`)
    );
  }

  if (include.has("experiments")) {
    parts.push(
      "Interactive experiments from this world on builtbyshrey.com:",
      ...canon.experiments.map((e) => `- ${e.name} (${e.url}): ${detail(e.fits)}`)
    );
  }

  return parts.join("\n");
}

/**
 * Shape the canon into documents for the vector index. The indexer embeds
 * `searchable_content` and stores the rest as payload; content_type and
 * embedding are added there.
 *
 * @returns {Array<{original_id: string, aspect: string, title: string, description: string, url: string|null, searchable_content: string}>}
 */
export function buildCanonDocuments() {
  const docs = [];
  const worldUrl = "https://builtbyshrey.com/you-are-here/";

  // Overview
  docs.push({
    original_id: "hl_overview",
    aspect: "overview",
    title: `${canon.meta.title} — world overview`,
    description: canon.logline,
    url: worldUrl,
    searchable_content: [
      `${canon.meta.title}, a ${canon.meta.form} by ${canon.meta.author}.`,
      `${canon.meta.structure}. ${canon.meta.status}. Setting: ${canon.meta.setting}.`,
      `Logline: ${canon.logline}`,
      "Rules of the world:",
      ...canon.world_rules.map((r) => `${r.name}: ${r.summary}`),
      `Content policy: ${canon.meta.content_policy}`,
    ].join("\n"),
  });

  // Timeline, grouped by era for retrieval-sized documents
  const eras = [
    { key: "pre_collapse", title: "Before the collapse (2026–2027)" },
    { key: "collapse", title: "The collapse (2028–2031)" },
    { key: "new_economy", title: "The new economy (2031–2042)" },
    { key: "world_of_2047", title: "The world of 2047" },
  ];
  for (const era of eras) {
    const entries = canon.timeline.filter((t) => t.era === era.key);
    if (entries.length === 0) continue;
    docs.push({
      original_id: `hl_timeline_${era.key}`,
      aspect: "timeline",
      title: `${canon.meta.title} timeline — ${era.title}`,
      description: entries.map((t) => t.title).join("; "),
      url: worldUrl,
      searchable_content: [
        `Alternate-history timeline of ${canon.meta.title}: ${era.title}.`,
        ...entries.map((t) => `${t.period} — ${t.title}: ${t.summary}`),
      ].join("\n"),
    });
  }

  // Institutions
  for (const inst of canon.institutions) {
    docs.push({
      original_id: `hl_institution_${inst.id}`,
      aspect: "institutions",
      title: inst.name,
      description: `Institution in the world of ${canon.meta.title}`,
      url: worldUrl,
      searchable_content: `${inst.name}, from ${canon.meta.title} by ${canon.meta.author}:\n${inst.summary}`,
    });
  }

  // Technology (one combined doc)
  docs.push({
    original_id: "hl_technology",
    aspect: "technology",
    title: `${canon.meta.title} — technology`,
    description: canon.technology.map((t) => t.name).join("; "),
    url: worldUrl,
    searchable_content: [
      `Technology of the world of ${canon.meta.title}:`,
      ...canon.technology.map((t) => `${t.name}: ${t.summary}`),
    ].join("\n"),
  });

  // Economics
  docs.push({
    original_id: "hl_economics",
    aspect: "market",
    title: `${canon.meta.title} — the economics of feeling`,
    description: "How emotions are priced, contracted, and traded",
    url: "https://builtbyshrey.com/ele",
    searchable_content: [
      `Economics of the emotional labor market in ${canon.meta.title}:`,
      `Market logic: ${canon.economics.market_logic}`,
      `Contract economics: ${canon.economics.contract_economics}`,
      `Contamination risk: ${canon.economics.contamination_risk}`,
      `Scale: ${canon.economics.scale}`,
    ].join("\n"),
  });

  // Characters
  for (const ch of canon.characters) {
    docs.push({
      original_id: `hl_character_${ch.id}`,
      aspect: "characters",
      title: `${ch.name} (${canon.meta.title})`,
      description: `Character in ${canon.meta.title} — opening-chapter setup only`,
      url: worldUrl,
      searchable_content: `${ch.name}, a character in ${canon.meta.title} by ${canon.meta.author}:\n${ch.summary}`,
    });
  }

  // Experiments
  for (const ex of canon.experiments) {
    docs.push({
      original_id: `hl_experiment_${ex.id}`,
      aspect: "experiments",
      title: `${ex.name} — interactive experiment`,
      description: `Live experiment from the world of ${canon.meta.title}`,
      url: ex.url,
      searchable_content: [
        `${ex.name}, an interactive experiment from the world of ${canon.meta.title}, live at ${ex.url}:`,
        ex.fits,
      ].join("\n"),
    });
  }

  return docs;
}

export default { getCanon, buildWorldContext, buildCanonDocuments, SPOILER_GUARDRAIL };
