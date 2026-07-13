/**
 * Meridian Public API — compliance document library.
 *
 * In-world regulatory and contract texts. Ported verbatim from the reference
 * implementation; copy is final. Shared by the get_compliance_document tool
 * and the meridian://compliance/{doc} MCP resources.
 */

export const COMPLIANCE_DOCS = {
  emote_act_overview:
    "THE EMOTE ACT (adopted across the democratic West, 2030s). Establishes the statutory 'provider' class for consenting emotional-data laborers: informed consent requirements, per-unit compensation floors, chain-of-custody authentication standards, and decommission rules for companion systems. Was the EMOTE Act perfect? Of course not; no legislation is. It is, however, certified, and so are we.",
  chain_of_custody:
    "CHAIN OF CUSTODY, the six links: (1) a real, CONSENTING human; (2) IDENTIFIED, with clean legal title to their own affect; (3) a TAMPER-EVIDENT interface reading limbic source directly — never a performable face; (4) scored on the REARDON-LIN scale; (5) TIMESTAMPED to the market cycle; (6) title transferred on authentication. Break any link and the product is indistinguishable from tin.",
  reardon_lin_scale:
    "THE REARDON-LIN SCALE. Industry-standard quantization of authenticated affect. Sustained vocalized affect above 0.7 qualifies for premium grading; depth, duration, and baseline adherence determine tier. Units are billed in kWh-equivalent for historical reasons the industry has elected to keep.",
  subsection_14:
    "SUBSECTION 14 — WELLNESS BENEFITS (standard provider agreement, p. 31 of 47). Providers receive twelve annual sessions with a licensed clinician, tier-one psychiatric medication coverage, and continuity-of-care guarantees. NOTE: utilization of wellness benefits may constitute deviation from contracted emotional baseline under the provider's exclusivity schedule. Providers are encouraged to consult their agent before feeling better. This benefit is disclosed. Disclosure is the standard.",
  decommission_policy:
    "DECOMMISSION POLICY (per EMOTE Act). Upon contract termination, all companion and environment systems associated with a provider are decommissioned. No residual emotional profile remains active. Logged farewells are retained as uncategorizable data.",
};

/** Ordered enum of valid compliance-document keys (drives Zod + resource registration). */
export const COMPLIANCE_DOC_KEYS = Object.keys(COMPLIANCE_DOCS);
