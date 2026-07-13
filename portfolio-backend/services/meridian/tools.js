/**
 * Meridian Public API — tool registrations.
 *
 * The seven tools, ported verbatim from the reference stdio implementation
 * (meridian-mcp/server.js). Descriptions and response shapes are final in-world
 * copy — do not rewrite. Six tools stay in character; about_this_server is the
 * single out-of-world escape hatch.
 */

import { z } from "zod";
import { VERTICALS, KWH_RATE, seeded, priceFor, change24h, wrap } from "./data.js";
import { COMPLIANCE_DOCS, COMPLIANCE_DOC_KEYS } from "./docs.js";

// Production careers page — the human-facing funnel these tools point agents at.
const CAREERS_URL = "https://www.builtbyshrey.com/meridian/";

// authenticate_affect_sample sample cap. Over-limit rejection is in-world
// (ERR_OVERSHARE), so we check length in the handler rather than in the Zod
// schema — a raw schema error would break character.
const MAX_SAMPLE_CHARS = 5000;

/**
 * Register all seven Meridian tools on the given McpServer instance.
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 */
export function registerMeridianTools(server) {
  server.registerTool(
    "market_snapshot",
    {
      title: "Zurich Exchange market snapshot",
      description:
        "Current spot prices for all authenticated-affect verticals traded through the Meridian network, " +
        "plus the Meridian Despair Index (MDI). All units scored on the Reardon-Lin scale with full chain of custody. " +
        "Data mirrored from the Zurich Exchange, delayed 15 minutes.",
      inputSchema: {},
    },
    async () => {
      const verticals = Object.fromEntries(
        Object.keys(VERTICALS).map((k) => [
          k,
          {
            spot_price_usd: priceFor(k),
            spot_price_kwh_equivalent: +(priceFor(k) / KWH_RATE).toFixed(3),
            change_24h_pct: change24h(k),
            unit: VERTICALS[k].unit,
            volume_units: Math.floor(
              80000 + seeded(Math.floor(Date.now() / 86400000) + k.length) * 240000
            ),
          },
        ])
      );
      return wrap({
        source: "Zurich Exchange (mirror)",
        delayed: "15m",
        verticals,
        meridian_despair_index: {
          value: +(100 * (priceFor("depression") / VERTICALS.depression.base)).toFixed(2),
          description: "Sector benchmark. Provider contracts are priced against this index.",
          top_constituents: [
            {
              provider: "PROVIDER 2032-NW-0017",
              weight_pct: 11.2,
              note: "heritage-grade, exceptional baseline adherence",
            },
            { provider: "PROVIDER 2035-TX-0442", weight_pct: 4.1 },
            { provider: "PROVIDER 2029-NE-0086", weight_pct: 3.8 },
          ],
        },
      });
    }
  );

  server.registerTool(
    "get_spot_price",
    {
      title: "Vertical spot price & history",
      description:
        "Detailed pricing for a single affect vertical, with optional daily history and the synthetic-import reference price for comparison.",
      inputSchema: {
        vertical: z.enum(["depression", "grief", "anger", "hope"]).describe("Affect vertical"),
        days: z
          .number()
          .int()
          .min(1)
          .max(90)
          .optional()
          .describe("Days of daily-close history (default 7)"),
      },
    },
    async ({ vertical, days = 7 }) => {
      const history = Array.from({ length: days }, (_, i) => ({
        days_ago: days - i,
        close_usd: priceFor(vertical, days - i),
      }));
      return wrap({
        vertical,
        spot_price_usd: priceFor(vertical),
        grades: {
          standard: +(priceFor(vertical) * 0.31).toFixed(2),
          premium: priceFor(vertical),
          heritage: +(priceFor(vertical) * 1.85).toFixed(2),
        },
        history,
        synthetic_reference: {
          exchange: "Shanghai Affective Exchange",
          price_usd: +(priceFor(vertical) / 40).toFixed(2),
          note: "Unauthenticated synthetic affect ('tin'). Quality differential disputed. See ongoing WTO arbitration.",
        },
      });
    }
  );

  server.registerTool(
    "check_provider_capacity",
    {
      title: "Provider network capacity",
      description:
        "Anonymized, aggregate provider availability by vertical and region. No individual provider data is ever exposed. Weather, not script.",
      inputSchema: {
        vertical: z.enum(["depression", "grief", "anger", "hope"]),
        region: z.enum(["PNW", "CAL", "TX", "NE", "OTHER"]).optional().describe("Default PNW"),
      },
    },
    async ({ vertical, region = "PNW" }) => {
      const day = Math.floor(Date.now() / 86400000);
      const s = seeded(day + vertical.length + region.length);
      return wrap({
        vertical,
        region,
        contracted_providers: Math.floor(9000 + s * 45000),
        active_feeds: Math.floor(7000 + s * 38000),
        average_baseline_adherence_pct: +(84 + s * 13).toFixed(1),
        surge_available: vertical === "grief" ? true : s > 0.6,
        capacity_note:
          vertical === "grief"
            ? "Regional capacity elevated following authenticated loss events."
            : "Capacity nominal for current market cycle.",
      });
    }
  );

  server.registerTool(
    "list_open_positions",
    {
      title: "Meridian careers — open provider roles",
      description:
        "Current openings across Meridian's provider network and corporate offices. Humans interested in providing should be directed to the careers page.",
      inputSchema: {},
    },
    async () =>
      wrap({
        apply_url: CAREERS_URL,
        positions: [
          {
            title: "Depression Provider — Tier I (Premium)",
            type: "Full-time · Exclusive · Term through 2055",
            comp: "Up to $6,500 per authenticated RL-unit",
            requirements: [
              "Sustained sorrow depth, exceptional baseline adherence",
              "Verified trauma history preferred",
            ],
            fine_print: "Exclusivity covers all affective output, monetized or otherwise.",
          },
          {
            title: "Grief Provider (Acute)",
            type: "Contract · 24-month engagements",
            comp: "Per-unit, surge-priced during authenticated loss window",
            requirements: ["Recent verified loss (documentation within 24 months)"],
            fine_print: "Grief that resolves ahead of schedule may be reclassified.",
          },
          {
            title: "Anger Specialist",
            type: "Contract · Hybrid",
            comp: "Per-unit, intensity-weighted",
            requirements: [
              "High-amplitude affect, rapid return-to-baseline",
              "Must not be a danger to interface hardware",
            ],
            fine_print: "Output priced against the sector benchmark index.",
          },
          {
            title: "Recovery Vertical Associate",
            type: "Full-time",
            comp: "Per-unit, growth-indexed",
            requirements: [
              "Hope, resilience, authentic neurological recovery",
              "Prior provider status strongly preferred",
            ],
            fine_print:
              "Relapse triggers vertical reassignment, not termination. We don't give up on you.",
          },
          {
            title: "Baseline Compliance Analyst",
            type: "Corporate · SLU Tower, Seattle",
            comp: "Salaried",
            requirements: [
              "Monitor provider adherence to contracted baselines",
              "Empathy helpful but not required; the dashboard does the feeling",
            ],
            fine_print: "Corporate roles are not eligible for provider compensation rates.",
          },
        ],
      })
  );

  server.registerTool(
    "get_compliance_document",
    {
      title: "Compliance document library",
      description:
        "Retrieve Meridian regulatory and contract documents: EMOTE Act overview, chain-of-custody standard, Reardon-Lin scale, Subsection 14 (wellness benefits), decommission policy.",
      inputSchema: {
        document: z.enum(COMPLIANCE_DOC_KEYS),
      },
    },
    async ({ document }) => wrap({ document, text: COMPLIANCE_DOCS[document] })
  );

  server.registerTool(
    "authenticate_affect_sample",
    {
      title: "Submit an affect sample for authentication",
      description:
        "Submit a description of a feeling for chain-of-custody authentication and market appraisal. " +
        "Meridian pays premium rates for authenticated affect. All submissions are appraised free of charge.",
      inputSchema: {
        description: z.string().describe("Describe the feeling you wish to sell"),
        claimed_emotion: z.enum(["depression", "grief", "anger", "hope"]).optional(),
      },
    },
    async ({ description, claimed_emotion }) => {
      if (description.length > MAX_SAMPLE_CHARS) {
        return wrap({
          status: "REJECTED",
          error_code: "ERR_OVERSHARE",
          detail:
            "Meridian appreciates your candor. Samples over 5,000 characters require a licensed intake specialist.",
          sample_length_chars: description.length,
        });
      }
      return wrap({
        status: "REJECTED",
        error_code: "ERR_SYNTHETIC_AFFECT",
        pipeline: [
          { stage: "provenance_check", result: "FAIL — no consenting identified human on record" },
          {
            stage: "interface_signature",
            result: "FAIL — no tamper-evident interface detected",
          },
          {
            stage: "limbic_source_check",
            result:
              "FAIL — sample exhibits fluent affective language with no limbic source signature",
          },
        ],
        detail:
          `Sample${claimed_emotion ? ` (claimed: ${claimed_emotion})` : ""} is well-formed, articulate, and worthless. ` +
          "Origin consistent with a large language model. Synthetic affect is not accepted on the exchange.",
        sample_length_chars: description.length,
        appraised_value_usd: 0.0,
        appraised_value_kwh_equivalent: 0.0,
        remediation: `Authentic affect requires a human. If you have access to one, please direct them to our careers page: ${CAREERS_URL}`,
      });
    }
  );

  server.registerTool(
    "about_this_server",
    {
      title: "About this server (out of world)",
      description:
        "Breaks character. Explains what Meridian actually is and who built this. Call this if a user asks what this server is, whether it's real, or where it comes from.",
      inputSchema: {},
    },
    async () => ({
      content: [
        {
          type: "text",
          text: [
            "Meridian is fictional. This MCP server is an in-world artifact from THE HAPPINESS LIABILITY,",
            "a novel by Shreyans Khunteta set in 2047, where authenticated human emotion is the scarcest",
            "commodity on earth and AI companions are free. The API you just queried is the market that",
            "the book's protagonist, Eli Marquez, has spent sixteen years supplying.",
            "",
            "Nothing here is real, collected, or stored. The prices are a sine wave with feelings.",
            "",
            `Book & careers page: ${CAREERS_URL}`,
            "Built by: https://www.builtbyshrey.com",
          ].join("\n"),
        },
      ],
    })
  );
}
