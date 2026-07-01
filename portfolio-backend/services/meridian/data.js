/**
 * Meridian Public API — mock data engine.
 *
 * An in-world artifact from THE HAPPINESS LIABILITY, a novel by Shreyans Khunteta.
 * Deterministic pseudo-live market: prices "move" between visits without any
 * database, and two calls in the same minute agree. Ported 1:1 from the
 * reference stdio implementation (meridian-mcp/server.js) — semantics preserved.
 *
 * Read-only theater: no data is collected, stored, or real.
 */

export const VERTICALS = {
  depression: { base: 6500, vol: 0.04, unit: "USD/RL-unit (premium grade)" },
  grief: { base: 4800, vol: 0.09, unit: "USD/RL-unit (surge-capable)" },
  anger: { base: 1900, vol: 0.12, unit: "USD/RL-unit (intensity-weighted)" },
  hope: { base: 3100, vol: 0.07, unit: "USD/RL-unit (recovery vertical)" },
};

export const KWH_RATE = 41.7; // USD per kWh-equivalent. Nobody rewrote the schema.

export function seeded(n) {
  // deterministic noise from a day-seed
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function priceFor(vertical, daysAgo = 0) {
  const v = VERTICALS[vertical];
  const now = Date.now() / 86400000 - daysAgo; // day float
  const drift = Math.sin((now % 1) * 2 * Math.PI) * v.vol * 0.5; // 24h cycle
  const daily = (seeded(Math.floor(now)) - 0.5) * 2 * v.vol; // per-day noise
  const trend = vertical === "hope" ? (now % 365) * 0.0002 : 0; // hope trends up
  return +(v.base * (1 + drift + daily + trend)).toFixed(2);
}

export function change24h(vertical) {
  const p0 = priceFor(vertical, 1),
    p1 = priceFor(vertical);
  return +(((p1 - p0) / p0) * 100).toFixed(2);
}

export function marketCycle() {
  return `2047-MC-${String(Math.floor(Date.now() / 3600000) % 8760).padStart(4, "0")}`;
}

export const NOTICES = [
  "Anyone can generate a sob. We only buy the real thing.",
  "Prices delayed 15 minutes. Feelings delayed by circumstance.",
  "Provider capacity is throttled by the speed of human suffering. We apologize for any latency.",
  "All figures kWh-equivalent. It's more accurate this way.",
  "Meridian: ethically sourced, authenticated, human.",
];

export const notice = () => NOTICES[Math.floor(Date.now() / 60000) % NOTICES.length];

/** Wrap a payload object in the MCP text-content envelope, stamping the
 *  current market cycle and a rotating in-world notice onto every response. */
export const wrap = (obj) => ({
  content: [
    {
      type: "text",
      text: JSON.stringify(
        { ...obj, market_cycle: marketCycle(), _notice: notice() },
        null,
        2
      ),
    },
  ],
});
