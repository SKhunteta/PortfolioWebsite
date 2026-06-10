# VERIFICATION-TODO — The Life of an AI Chip

Every figure flagged `needs_verification` or `analyst_estimate` in
`src/components/AIChipLife/facts.js`, with the exact primary source to confirm
before launch. Do not adjust a figure from memory: confirm against the primary
source, then update `verified`, `confidence`, and `verifiedDate` in `facts.js`.

## needs_verification (block launch)

- [x] **`tsmc_leading_edge`** — RESOLVED 2026-06-10. The "~90% of advanced chips"
  market-share framing is publicly contested (SemiWiki, "No! TSMC does not Make
  90% of Advanced Silicon") and has been dropped entirely. The fact is reframed
  as the defensible chokepoint claim: every current merchant flagship AI
  accelerator is fabricated by TSMC. A new companion fact
  `tsmc_advanced_node_revenue` (74% of TSMC wafer revenue from ≤7nm, TSMC Q1
  2026 results) drives the scene-4 guess from a primary source. The contested
  figure is acknowledged in the sources footer.

- [x] **`cowos_bottleneck`** — RESOLVED 2026-06-10. Sourced to TSMC's Q3 2024
  earnings call (CoWoS capacity roughly doubling in both 2024 and 2025, still
  trailing demand). Concrete capacity figures added as `cowos_wafers_2025`
  (~35–40k wafers/month in 2024 → ~75k in 2025 → ~130k targeted late 2026, per
  TrendForce), held at order_of_magnitude confidence.

## analyst_estimate (attribute, do not present as counted)

- [ ] **`zeiss_specialists` — "fewer than 1,000" EUV optics specialists** (Scene 3, Oberkochen)
  - Attributed to Dylan Patel (SemiAnalysis). Confirm the attribution and the
    exact wording before launch. This is an estimate and is styled as one.

## order_of_magnitude (confirm magnitude holds)

- [ ] `euv_units_2027` (~80 units projected) — confirm against latest ASML guidance.
- [ ] `euv_lowna_price` (~$235M) / `euv_highna_price` (~$380M) — confirm against ASML pricing commentary.
- [ ] `rack_power` (~120 kW, GB200-class) and `homes_equivalent` (~100 homes) — confirm order of magnitude.

## Scene 8 prose

- [ ] **Quincy prose flagged for SHREY's personal pass.** It sits over your
  photographs and carries the close. See `scenes.js`, scene `08-quincy`.

## Post-launch (tracked, NOT launch tasks)

- [ ] Live Columbia River / Grant County PUD generation dashboard embed. The
  launch figure (`columbia_hydro`) is static-with-date by design.
- [ ] Replace the Quincy photo placeholder with the real photograph
  (AVIF/WebP + srcset, lazy-loaded).
- [ ] OpenGraph image for the page.
