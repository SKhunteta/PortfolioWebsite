// The Memory Tax — pricing data for Apple's June 25, 2026 price hike.
//
// WHAT IS EXACT vs. MODELED (read this before trusting a number on the page):
//
//   • BASE-CONFIGURATION prices (`basePrice.before` / `basePrice.after`) are
//     EXACT, taken from Apple's published U.S. list prices before and after the
//     June 25, 2026 increase. These are the hero figures — every one is sourced
//     in SOURCES below and tagged `confidence: "sourced"`.
//
//   • UPGRADE-TIER deltas (memory & storage rungs above the base config) use
//     Apple's long-standing published U.S. upgrade ladder for the "before"
//     column. Apple did NOT publish a full tier-by-tier table for the hike, so
//     the "after" column is MODELED: each rung is raised ~10% per step, the one
//     concrete per-step figure reported in the coverage (a memory step moving
//     from €200 to €220). These rungs are tagged `confidence: "modeled"` and
//     are rendered with a visible badge. The thesis of the piece lives here: the
//     surge is in DRAM and NAND specifically, so the tax compounds at every
//     memory and storage rung, not just the sticker.
//
// Never present a `modeled` number as if Apple published it. If Apple later
// releases the real tier table, replace the `after` values and flip the flag.

export const HIKE_DATE = "June 25, 2026";
export const SNAPSHOT_DATE = "2026-06-27";

export const PRE_HIKE_LABEL = "Last week";
export const POST_HIKE_LABEL = "Today";

// The reason the whole thing happened — surfaced as the piece's standfirst.
export const STANDFIRST =
  "For the first time, Apple passed soaring memory and storage costs straight to consumers. DRAM and NAND prices roughly quadrupled over three quarters as AI data centers absorbed the world's memory supply. On June 25, 2026, the bill arrived. iPhone, Watch, and AirPods were spared — the machines you fill with memory were not.";

export const METHODOLOGY =
  "Base-configuration prices are exact, from Apple's published U.S. list before and after the June 25, 2026 increase. Upgrade rungs (extra memory and storage) use Apple's standard pre-hike upgrade ladder for the “last week” column; Apple did not publish a full tier-by-tier table for the hike, so each post-hike rung is modeled at roughly +10% per step — the one concrete figure in the coverage (a memory step moving €200 → €220). Modeled rungs are badged as such.";

export const SOURCES = [
  {
    id: "9to5mac-hike",
    label: "9to5Mac — Apple announces significant price increases for Mac, iPad",
    url: "https://9to5mac.com/2026/06/25/apple-price-increases-mac-ipad-more/",
  },
  {
    id: "macrumors-hike",
    label: "MacRumors — Apple Just Increased Prices on MacBooks, iPads, and More",
    url: "https://www.macrumors.com/2026/06/25/apple-just-increased-prices/",
  },
  {
    id: "macrumors-why",
    label: "MacRumors — Apple Explains Why It Raised Prices on 14 Products",
    url: "https://www.macrumors.com/2026/06/25/apple-explains-why-it-raised-prices/",
  },
  {
    id: "cnbc",
    label: "CNBC — Apple posts worst day in over a year after price hikes",
    url: "https://www.cnbc.com/2026/06/25/apple-macbook-ipad-price-hike-memory.html",
  },
  {
    id: "gizmodo",
    label: "Gizmodo — Apple Hikes Prices on Almost Everything Except iPhones",
    url: "https://gizmodo.com/apple-hikes-prices-on-almost-everything-except-iphones-2000777631",
  },
  {
    id: "toms",
    label: "Tom's Hardware — RAM crisis bites Apple as Mac and iPad price rises arrive",
    url: "https://www.tomshardware.com/laptops/macbooks/ram-crisis-bites-apple-as-unprecedented-mac-and-ipad-price-rises-arrive-cheapest-macbook-pro-price-hiked-by-usd400-to-usd1-999",
  },
  {
    id: "basic-tutorials",
    label: "Basic Tutorials — Apple Price Hike 2026 (RAM step €200 → €220)",
    url: "https://basic-tutorials.com/news/apple-price-hike-in-2026-heres-how-much-more-expensive-the-macbook-ipad-and-apple-tv-are-now/",
  },
  {
    id: "techcrunch",
    label: "TechCrunch — Apple raises Mac and iPad prices, spares iPhone for now",
    url: "https://techcrunch.com/2026/06/25/apple-raises-mac-and-ipad-prices-spares-iphone-for-now/",
  },
];

// Confidence levels, mirrored from the AI Chip piece's facts schema so the
// sources panel can style them consistently.
export const CONFIDENCE = {
  sourced: {
    key: "sourced",
    label: "Exact · sourced",
    blurb: "Apple's published U.S. list price, before and after the hike.",
    color: "#1D7324",
  },
  modeled: {
    key: "modeled",
    label: "Modeled · +~10%/step",
    blurb:
      "Apple did not publish a tier table for the hike. Upgrade rungs are modeled at roughly +10% per step (the reported €200 → €220 memory step).",
    color: "#B25000",
  },
};

// Helper: build an upgrade ladder rung. `before` is Apple's standard pre-hike
// upcharge above the base config; `after` is the modeled post-hike upcharge.
// The base rung (add 0) is exact by definition — it's the configuration whose
// before/after sticker prices are sourced.
const rung = (label, gb, before, after) => ({
  label,
  gb,
  add: { before, after },
  confidence: before === 0 ? "sourced" : "modeled",
});

// Apply the modeled +~10%/step bump, rounded to a clean $10, so the dataset
// stays declarative and the rule is auditable in one place.
const step = (label, gb, before) =>
  rung(label, gb, before, before === 0 ? 0 : Math.round((before * 1.1) / 10) * 10);

export const DEVICES = [
  // ───────────────────────────── MacBook ─────────────────────────────
  {
    id: "macbook-neo",
    line: "mac",
    family: "MacBook Neo",
    name: "MacBook Neo",
    chip: "A18 Pro",
    blurb: "The entry MacBook. Fanless, featherweight, and the first rung of the tax.",
    base: { memory: 8, storage: 256 },
    basePrice: { before: 599, after: 699, confidence: "sourced", sourceIds: ["9to5mac-hike", "gizmodo"] },
    memory: [step("8 GB", 8, 0)],
    storage: [step("256 GB", 256, 0), step("512 GB", 512, 200)],
  },
  {
    id: "macbook-air-13",
    line: "mac",
    family: "MacBook Air",
    name: 'MacBook Air 13"',
    chip: "M5",
    blurb: "The default laptop of the world. Now $200 more before you touch a single option.",
    base: { memory: 16, storage: 512 },
    basePrice: { before: 1099, after: 1299, confidence: "sourced", sourceIds: ["9to5mac-hike", "toms"] },
    memory: [step("16 GB", 16, 0), step("24 GB", 24, 200), step("32 GB", 32, 400)],
    storage: [step("512 GB", 512, 0), step("1 TB", 1024, 200), step("2 TB", 2048, 600)],
  },
  {
    id: "macbook-air-15",
    line: "mac",
    family: "MacBook Air",
    name: 'MacBook Air 15"',
    chip: "M5",
    blurb: "The big-screen Air. Same chip, same memory tax, two more inches.",
    base: { memory: 16, storage: 512 },
    basePrice: { before: 1299, after: 1499, confidence: "sourced", sourceIds: ["9to5mac-hike"] },
    memory: [step("16 GB", 16, 0), step("24 GB", 24, 200), step("32 GB", 32, 400)],
    storage: [step("512 GB", 512, 0), step("1 TB", 1024, 200), step("2 TB", 2048, 600)],
  },
  {
    id: "macbook-pro-14-m5",
    line: "mac",
    family: "MacBook Pro",
    name: 'MacBook Pro 14" (M5)',
    chip: "M5",
    blurb: "The cheapest Pro. The single sharpest line in the coverage: $1,699 → $1,999.",
    base: { memory: 16, storage: 1024 },
    basePrice: { before: 1699, after: 1999, confidence: "sourced", sourceIds: ["gizmodo", "cnbc", "toms"] },
    memory: [step("16 GB", 16, 0), step("24 GB", 24, 200), step("32 GB", 32, 400)],
    storage: [step("1 TB", 1024, 0), step("2 TB", 2048, 400), step("4 TB", 4096, 1000)],
  },
  {
    id: "macbook-pro-14-m5pro",
    line: "mac",
    family: "MacBook Pro",
    name: 'MacBook Pro 14" (M5 Pro)',
    chip: "M5 Pro",
    blurb: "Step up to the Pro chip and the base price steps up $300 too.",
    base: { memory: 24, storage: 1024 },
    basePrice: { before: 2199, after: 2499, confidence: "sourced", sourceIds: ["macrumors-hike"] },
    memory: [step("24 GB", 24, 0), step("48 GB", 48, 400)],
    storage: [step("1 TB", 1024, 0), step("2 TB", 2048, 400), step("4 TB", 4096, 1000)],
  },
  // ────────────────────────────── iPad ───────────────────────────────
  {
    id: "ipad-a16",
    line: "ipad",
    family: "iPad",
    name: "iPad (A16)",
    chip: "A16",
    blurb: "The cheapest iPad jumped a third in price overnight: $349 → $449.",
    base: { memory: 0, storage: 128 },
    basePrice: { before: 349, after: 449, confidence: "sourced", sourceIds: ["techcrunch", "gizmodo"] },
    memory: [],
    storage: [step("128 GB", 128, 0), step("256 GB", 256, 100)],
  },
  {
    id: "ipad-air-11",
    line: "ipad",
    family: "iPad Air",
    name: 'iPad Air 11" (M4)',
    chip: "M4",
    blurb: "The Air took the steepest iPad hit in dollars: +$150 at the base.",
    base: { memory: 0, storage: 128 },
    basePrice: { before: 599, after: 749, confidence: "sourced", sourceIds: ["gizmodo", "9to5mac-hike"] },
    memory: [],
    storage: [
      step("128 GB", 128, 0),
      step("256 GB", 256, 100),
      step("512 GB", 512, 300),
      step("1 TB", 1024, 500),
    ],
  },
  {
    id: "ipad-air-13",
    line: "ipad",
    family: "iPad Air",
    name: 'iPad Air 13" (M4)',
    chip: "M4",
    blurb: "The 13-inch Air: bigger glass, same +$150 memory tax baked into the base.",
    base: { memory: 0, storage: 128 },
    basePrice: { before: 799, after: 949, confidence: "sourced", sourceIds: ["9to5mac-hike"] },
    memory: [],
    storage: [
      step("128 GB", 128, 0),
      step("256 GB", 256, 100),
      step("512 GB", 512, 300),
      step("1 TB", 1024, 500),
    ],
  },
  {
    id: "ipad-pro-11",
    line: "ipad",
    family: "iPad Pro",
    name: 'iPad Pro 11" (M5)',
    chip: "M5",
    blurb: "Storage and memory are coupled here — exactly the components that surged.",
    base: { memory: 12, storage: 256 },
    basePrice: { before: 999, after: 1199, confidence: "sourced", sourceIds: ["9to5mac-hike", "gizmodo"] },
    memory: [],
    storage: [
      step("256 GB · 12 GB RAM", 256, 0),
      step("512 GB · 12 GB RAM", 512, 200),
      step("1 TB · 16 GB RAM", 1024, 600),
      step("2 TB · 16 GB RAM", 2048, 1000),
    ],
  },
  {
    id: "ipad-pro-13",
    line: "ipad",
    family: "iPad Pro",
    name: 'iPad Pro 13" (M5)',
    chip: "M5",
    blurb: "The most expensive iPad, and the one where the storage rungs bite hardest.",
    base: { memory: 12, storage: 256 },
    basePrice: { before: 1299, after: 1499, confidence: "sourced", sourceIds: ["9to5mac-hike"] },
    memory: [],
    storage: [
      step("256 GB · 12 GB RAM", 256, 0),
      step("512 GB · 12 GB RAM", 512, 200),
      step("1 TB · 16 GB RAM", 1024, 600),
      step("2 TB · 16 GB RAM", 2048, 1000),
    ],
  },
];

export const DEVICES_BY_ID = Object.fromEntries(DEVICES.map((d) => [d.id, d]));

export const MAC_DEVICES = DEVICES.filter((d) => d.line === "mac");
export const IPAD_DEVICES = DEVICES.filter((d) => d.line === "ipad");

// ─────────────────────────── price computation ───────────────────────────

const sumAdd = (rungs, gb, key) => {
  const match = rungs.find((r) => r.gb === gb);
  return match ? match.add[key] : 0;
};

// Compute the total price of a configuration in one era ("before" | "after"),
// plus the line-item breakdown the receipt renders.
export function computeConfig(device, { memory, storage }, era) {
  const base = device.basePrice[era];
  const memoryAdd = sumAdd(device.memory, memory, era);
  const storageAdd = sumAdd(device.storage, storage, era);
  return {
    base,
    memoryAdd,
    storageAdd,
    total: base + memoryAdd + storageAdd,
  };
}

// The full before/after contrast for a configuration, with per-line deltas.
export function priceContrast(device, selection) {
  const before = computeConfig(device, selection, "before");
  const after = computeConfig(device, selection, "after");
  return {
    before,
    after,
    delta: {
      base: after.base - before.base,
      memoryAdd: after.memoryAdd - before.memoryAdd,
      storageAdd: after.storageAdd - before.storageAdd,
      total: after.total - before.total,
    },
    // Whether any line in this configuration leans on a modeled rung.
    hasModeled:
      (selection.memory !== device.base.memory && device.memory.length > 0) ||
      selection.storage !== device.base.storage,
  };
}

export const formatUSD = (n) =>
  `$${Math.round(n).toLocaleString("en-US")}`;

export const formatSigned = (n) =>
  `${n >= 0 ? "+" : "−"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

export const percentChange = (before, after) =>
  before === 0 ? 0 : ((after - before) / before) * 100;
