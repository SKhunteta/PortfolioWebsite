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

- [x] **`zeiss_specialists` — "fewer than 1,000" EUV optics specialists** (Scene 3, Oberkochen)
  - RESOLVED 2026-07-01. Attribution confirmed: Dylan Patel on the Dwarkesh
    Podcast (2024): "Carl Zeiss probably employs less than a thousand people
    working on this, and all of those people are super, super specialized."
    That is a claim about Zeiss's specialized headcount, not literally everyone
    alive who could do the work, so the fact label, source quote, and scene-3
    prose were reworded to the headcount framing (defensible because Zeiss is
    the sole supplier).

## order_of_magnitude (confirm magnitude holds)

- [x] `euv_units_2027` (~80 units projected) — RESOLVED 2026-07-01. Confirmed
  against June 2026 coverage of ASML guidance: ~80 EUV units in 2027, of which
  ~10 High-NA.
- [x] `euv_lowna_price` (~$235M) / `euv_highna_price` (~$380M) — RESOLVED
  2026-07-01. High-NA $380M confirmed (ASML CFO; Samsung bought two for $773M).
  Low-NA reports range $180–235M by configuration/vintage; FY2025 EUV revenue
  (€11.6B / 48 systems) implies ~€242M average. Held at order_of_magnitude with
  a range note.
- [x] `rack_power` (~120 kW, GB200-class) and `homes_equivalent` (~100 homes) —
  RESOLVED 2026-07-01. NVIDIA nominal GB200 NVL72 spec is exactly 120 kW
  (130–132 kW reported under full load); EIA average U.S. household ~10,500
  kWh/yr ≈ 1.2 kW continuous, so 120 kW ≈ 100 homes. rack_power upgraded to
  verified.

## Corrections applied 2026-07-01 (full fact re-check)

- `euv_units_2025` source line wrongly said "including 4 High-NA EXE:5200B
  systems." ASML's FY2025 release recognized revenue on the *first* EXE:5200B
  (two High-NA systems total in Q4 2025). Corrected.
- `korea_revenue_share` and `memory_share_shipments` are shares of ASML *net
  system sales*, not total revenue. Labels, sources, and the scene-5 guess
  prompt were tightened accordingly.
- `cowos_wafers_2025` late-2026 target widened to ~120–130k wafers/month (the
  ~130k figure is the top of TrendForce's reported range).
- Scene-4 Samsung epitaph reworded: Samsung is nominally at the same node
  generation (SF2 vs N2); the honest gap is yield and flagship-customer
  adoption, not node naming.

## Scene 8 prose

- [ ] **Quincy prose flagged for SHREY's personal pass.** It sits over your
  photographs and carries the close. See `scenes.js`, scene `08-quincy`.

## Post-launch (tracked, NOT launch tasks)

- [ ] Live Columbia River / Grant County PUD generation dashboard embed. The
  launch figure (`columbia_hydro`) is static-with-date by design.
- [ ] Replace the Quincy photo placeholder with the real photograph
  (AVIF/WebP + srcset, lazy-loaded).
- [ ] OpenGraph image for the page.
