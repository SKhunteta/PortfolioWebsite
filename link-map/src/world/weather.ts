// Real Seattle rain drives the wet look. The poller feeds the backend's
// weather observation in (null = unknown = honestly dry); the single frame
// driver eases WEATHER.rain toward the target so a shower arrives like a
// wash, not a switch. Hot paths read WEATHER directly — no React.
//
// ?rain=0..1 pins it for demos, tests, and screenshots (like ?phase).

export const WEATHER = {
  rain: 0, // eased 0..1, what every shader reads
  target: 0,
};

const EASE_TAU_S = 6;

function parseOverride(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("rain");
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null;
}

let override: number | null = parseOverride();

export function setRainOverride(value: number | null) {
  override = value == null ? null : Math.max(0, Math.min(1, value));
}

/** mm/h -> visual intensity. Seattle drizzle (~0.3 mm/h) already reads as
 *  wet paper; ~3 mm/h and up is the full effect. */
export function rainLevel(mmH: number | null | undefined): number {
  if (mmH == null || !(mmH > 0.02)) return 0;
  return Math.min(1, Math.sqrt(mmH / 3));
}

export function setRainTarget(mmH: number | null | undefined) {
  WEATHER.target = rainLevel(mmH);
}

/** Ticked once per frame by the single driver (Trains.tsx). */
export function tickWeather(dt: number) {
  const target = override ?? WEATHER.target;
  WEATHER.rain += (target - WEATHER.rain) * Math.min(1, dt / EASE_TAU_S);
}
