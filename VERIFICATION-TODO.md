# VERIFICATION-TODO — The Life of an AI Chip

Every figure flagged `needs_verification` or `analyst_estimate` in
`src/components/AIChipLife/facts.js`, with the exact primary source to confirm
before launch. Do not adjust a figure from memory: confirm against the primary
source, then update `verified`, `confidence`, and `verifiedDate` in `facts.js`.

## needs_verification (block launch)

- [ ] **`tsmc_leading_edge` — TSMC share of leading-edge chips (~90%)** (Scene 4, Hsinchu)
  - Primary source: TSMC quarterly investor presentation / annual report, *or*
    a dated analyst breakdown of leading-edge (≤5nm) foundry share.
  - MUST be phrased as share of the *most advanced / leading-edge* chips. Never
    "90% of all chips." Update the `note` if the phrasing tightens.

- [ ] **`cowos_bottleneck` — CoWoS as the 2023–24 supply bottleneck** (Scene 6, Packaging)
  - STUB. SHREY to source. Primary source: TSMC commentary on CoWoS capacity
    expansion (earnings calls, 2023–2024), and reporting tying GPU supply to
    packaging rather than wafers.
  - Add a concrete capacity figure (e.g. monthly CoWoS wafer capacity and its
    planned multiple) once sourced, and flip `verified` to true.

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
