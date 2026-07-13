// The one clock. A single useFrame driver advances it with clamped dt so a
// dropped frame or tab resume never teleports an animation; everything that
// breathes (stations, water, fog, drift) reads the same phase.

export const CLOCK = {
  t: 0, // integrated seconds, clamped-dt
  dt: 0, // last frame's clamped dt
  breath: 0, // global ~9s sine, 0..1
};

const BREATH_PERIOD_S = 9;

export function tickClock(rawDt: number) {
  const dt = Math.min(rawDt, 0.1);
  CLOCK.t += dt;
  CLOCK.dt = dt;
  CLOCK.breath = 0.5 + 0.5 * Math.sin((CLOCK.t * Math.PI * 2) / BREATH_PERIOD_S);
}
