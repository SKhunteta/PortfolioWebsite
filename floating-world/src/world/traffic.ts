// Real Seattle traffic pressure, by the clock — NOT by data. The street cars
// (map/Cars.tsx) and the Burke-Gilman cyclists (map/Cyclists.tsx) key their
// density to the actual local hour in Seattle: thick at the morning and
// evening peaks, a midday plateau, near-empty at 3am. It is the ferry tier of
// honesty — "true to the clock, deterministic, never presented as live" — and
// because both consumers render clearly STYLIZED toy vehicles (a few carts, a
// few riders) with no per-vehicle feed behind them, never a precise count, it
// can't be mistaken for a live feed.
//
// ?traffic=off|0..1 pins it for demos, tests, and screenshots (matching the
// ?phase= / ?weather= pins the rest of the piece already uses).

// Seattle wall-clock hour, fractional 0..24. One formatter, built once.
const HOUR_FMT =
  typeof Intl !== "undefined"
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      })
    : null;

function localHour(date: Date): number {
  if (!HOUR_FMT) return 12; // SSR / no-Intl fallback: assume midday
  let h = 0;
  let m = 0;
  for (const p of HOUR_FMT.formatToParts(date)) {
    if (p.type === "hour") h = parseInt(p.value, 10);
    else if (p.type === "minute") m = parseInt(p.value, 10);
  }
  return (h % 24) + m / 60;
}

// Two commute peaks over a faint all-hours floor: a morning rush around 8:00,
// an evening rush around 17:30, a soft midday plateau, ~0.05 overnight.
function rushAt(hour: number): number {
  const am = Math.exp(-Math.pow((hour - 8.0) / 1.6, 2));
  const pm = Math.exp(-Math.pow((hour - 17.5) / 1.8, 2));
  const midday = 0.32 * Math.exp(-Math.pow((hour - 13.0) / 3.5, 2));
  return Math.min(1, 0.05 + Math.max(am, pm) + midday);
}

function parseOverride(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("traffic");
  if (raw == null) return null;
  if (raw === "off") return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null;
}

let override: number | null = parseOverride();

export function setTrafficOverride(value: number | null) {
  override = value == null ? null : Math.max(0, Math.min(1, value));
}

// Recomputing the real hour every frame is wasteful (Intl.formatToParts costs
// a little); the pressure only crawls, so cache it and refresh every ~8s.
const cache = { at: -1e9, value: 0 };

/** Traffic pressure right now, 0..1. Cheap to call every frame. */
export function trafficIntensity(): number {
  if (override != null) return override;
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  if (now - cache.at < 8000) return cache.value;
  cache.at = now;
  cache.value = rushAt(localHour(new Date()));
  return cache.value;
}
