// Every number on the page traces to one of these entries. Stat cards and
// guess reveals accept a fact object only (never a literal), which structurally
// enforces the "no literals in stat/guess slots" rule from the plan.
//
// Schema (shared in spirit with the Chokepoints facts.yaml):
//   id            stable key
//   label         short human label for the stat card
//   value         the figure as a display string (units baked in)
//   numeric       machine-comparable number (used by guess reveals)
//   source        one-line provenance
//   verified      true | false  (false => surfaced as needs_verification)
//   confidence    "verified" | "order_of_magnitude" | "analyst_estimate" | "needs_verification"
//   verifiedDate  ISO date the figure was last confirmed
//   reverifyDays  cadence after which it should be re-checked
//   attribution   optional named analyst for analyst_estimate styling
//   note          optional caveat shown in small print

export const FACTS = {
  euv_monopoly: {
    id: "euv_monopoly",
    label: "EUV lithography suppliers",
    value: "1 (ASML, 100%)",
    numeric: 1,
    source: "ASML is the sole producer of EUV lithography scanners.",
    verified: true,
    confidence: "verified",
    verifiedDate: "2026-05-01",
    reverifyDays: 365,
  },
  euv_units_2025: {
    id: "euv_units_2025",
    label: "EUV scanners shipped in 2025",
    value: "48 units",
    numeric: 48,
    source: "ASML FY2025 results: 327 lithography systems sold, of which 279 DUV; ~48 EUV, including 4 High-NA EXE:5200B systems.",
    verified: true,
    confidence: "verified",
    verifiedDate: "2026-06-10",
    reverifyDays: 180,
  },
  euv_units_2026: {
    id: "euv_units_2026",
    label: "EUV scanners planned for 2026",
    value: "60+ units",
    numeric: 60,
    source: "ASML planned EUV output, 2026.",
    verified: true,
    confidence: "verified",
    verifiedDate: "2026-05-01",
    reverifyDays: 180,
  },
  euv_units_2027: {
    id: "euv_units_2027",
    label: "EUV scanners projected for 2027",
    value: "~80 units",
    numeric: 80,
    source: "ASML projected EUV output, 2027.",
    verified: true,
    confidence: "order_of_magnitude",
    verifiedDate: "2026-05-01",
    reverifyDays: 180,
  },
  euv_lowna_price: {
    id: "euv_lowna_price",
    label: "Low-NA EUV scanner price",
    value: "~$235M",
    numeric: 235000000,
    source: "Approximate list price of a Low-NA EUV scanner.",
    verified: true,
    confidence: "order_of_magnitude",
    verifiedDate: "2026-05-01",
    reverifyDays: 365,
  },
  euv_highna_price: {
    id: "euv_highna_price",
    label: "High-NA EUV scanner price",
    value: "~$380M",
    numeric: 380000000,
    source: "Approximate list price of a High-NA EUV scanner.",
    verified: true,
    confidence: "order_of_magnitude",
    verifiedDate: "2026-05-01",
    reverifyDays: 365,
  },
  zeiss_sole: {
    id: "zeiss_sole",
    label: "EUV optics suppliers",
    value: "1 (Carl Zeiss SMT)",
    numeric: 1,
    source: "Carl Zeiss SMT is ASML's sole supplier of EUV optics.",
    verified: true,
    confidence: "verified",
    verifiedDate: "2026-05-01",
    reverifyDays: 365,
  },
  zeiss_specialists: {
    id: "zeiss_specialists",
    label: "People who can do this optics work",
    value: "Fewer than 1,000",
    numeric: 1000,
    source: "Analyst estimate of EUV optics specialists worldwide.",
    verified: false,
    confidence: "analyst_estimate",
    attribution: "Dylan Patel, SemiAnalysis",
    verifiedDate: "2026-05-01",
    reverifyDays: 365,
    note: "An estimate, not a counted figure.",
  },
  tsmc_leading_edge: {
    id: "tsmc_leading_edge",
    label: "Foundries for leading-edge AI accelerators",
    value: "Effectively 1 (TSMC)",
    numeric: 1,
    source:
      "Every current merchant flagship AI accelerator (NVIDIA Blackwell-class, AMD Instinct) and most hyperscaler custom silicon is fabricated by TSMC.",
    verified: true,
    confidence: "verified",
    verifiedDate: "2026-06-10",
    reverifyDays: 90,
    note: "A widely quoted '~90% of advanced chips' market-share figure is contested (Intel and Samsung also run advanced nodes; see SemiWiki's rebuttal). This piece claims only the accelerator chokepoint, which holds.",
  },
  tsmc_advanced_node_revenue: {
    id: "tsmc_advanced_node_revenue",
    label: "TSMC wafer revenue from advanced nodes (≤7nm)",
    value: "74%",
    numeric: 74,
    source: "TSMC Q1 2026 results: 7nm-and-below technologies accounted for 74% of total wafer revenue (3nm alone 25%, 5nm 36%).",
    verified: true,
    confidence: "verified",
    verifiedDate: "2026-06-10",
    reverifyDays: 90,
  },
  memory_share_shipments: {
    id: "memory_share_shipments",
    label: "Memory share of recent ASML shipments",
    value: "51%",
    numeric: 51,
    source: "Memory makers' share of recent ASML system shipments.",
    verified: true,
    confidence: "verified",
    verifiedDate: "2026-05-01",
    reverifyDays: 180,
  },
  korea_revenue_share: {
    id: "korea_revenue_share",
    label: "South Korea share of ASML Q1 2026 revenue",
    value: "45%",
    numeric: 45,
    source: "South Korea's share of ASML revenue, Q1 2026.",
    verified: true,
    confidence: "verified",
    verifiedDate: "2026-05-01",
    reverifyDays: 180,
  },
  hbm_makers: {
    id: "hbm_makers",
    label: "HBM suppliers at the leading edge",
    value: "3 (SK hynix, Samsung, Micron)",
    numeric: 3,
    source: "The three HBM suppliers serving leading-edge accelerators.",
    verified: true,
    confidence: "verified",
    verifiedDate: "2026-05-01",
    reverifyDays: 180,
  },
  cowos_bottleneck: {
    id: "cowos_bottleneck",
    label: "The 2023–24 supply bottleneck",
    value: "CoWoS advanced packaging",
    numeric: null,
    source:
      "TSMC's Q3 2024 earnings call: CoWoS capacity to roughly double in both 2024 and 2025 and still trail customer demand.",
    verified: true,
    confidence: "verified",
    verifiedDate: "2026-06-10",
    reverifyDays: 90,
  },
  cowos_wafers_2025: {
    id: "cowos_wafers_2025",
    label: "CoWoS capacity, 2025",
    value: "~75,000 wafers/month",
    numeric: 75000,
    source: "TrendForce: TSMC CoWoS capacity ~35–40k wafers/month in 2024, roughly doubling to ~75k in 2025, targeting ~130k by late 2026.",
    verified: true,
    confidence: "order_of_magnitude",
    verifiedDate: "2026-06-10",
    reverifyDays: 180,
  },
  rack_power: {
    id: "rack_power",
    label: "Rack power draw (GB200-class)",
    value: "~120 kW",
    numeric: 120,
    source: "Approximate power draw of a GB200-class rack.",
    verified: true,
    confidence: "order_of_magnitude",
    verifiedDate: "2026-05-01",
    reverifyDays: 365,
  },
  homes_equivalent: {
    id: "homes_equivalent",
    label: "Equivalent U.S. homes",
    value: "~100 homes",
    numeric: 100,
    source: "A ~120 kW continuous draw is on the order of 100 average U.S. homes.",
    verified: true,
    confidence: "order_of_magnitude",
    verifiedDate: "2026-05-01",
    reverifyDays: 365,
  },
  columbia_hydro: {
    id: "columbia_hydro",
    label: "Quincy data-center power source",
    value: "Columbia River hydropower",
    numeric: null,
    source: "Grant County PUD hydropower from Columbia River dams.",
    verified: true,
    confidence: "verified",
    verifiedDate: "2026-05-01",
    reverifyDays: 365,
    note: "Static figure with verified date. A live dashboard embed is a tracked post-launch issue, not a launch task.",
  },
};

export const getFact = (id) => {
  const fact = FACTS[id];
  if (!fact) {
    throw new Error(`Unknown fact id: ${id}`);
  }
  return fact;
};
