import { create } from "zustand";
import { MEOW } from "./config";

// THE HEART OF THE GAME.
// One value — `g` in [0,1] — drives everything. Cat behavior, prop lift-off,
// lighting mood, neon intensity. Nothing else stores "how heavy the world is".
// Components read g from here (getState() in useFrame hot paths, narrow
// selectors in React UI) and derive visuals via palettes.ts.
//
// Unlike Ketu-9's wrapping year, the untouched dial BREATHES: a slow cosine
// swing 1g → 0g → 1g, so a visitor who never finds the slider still gets the
// whole show. Scrubbing pauses the breath; the oscillator re-seeds so resuming
// continues smoothly from wherever the scrub left off.

const TAU = Math.PI * 2;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

interface GravityState {
  g: number; // 1 = full spin gravity, 0 = free fall
  t: number; // internal oscillator time
  running: boolean;
  secondsPerCycle: number;

  /** Advance the breath. Call once per frame with delta seconds. */
  tick: (dt: number) => void;
  /** Jump to an absolute gravity (used by the scrub slider + Observer). */
  setG: (g: number) => void;
  setRunning: (running: boolean) => void;
  setSecondsPerCycle: (s: number) => void;
}

export const useGravity = create<GravityState>((set, get) => ({
  g: MEOW.startG,
  t: 0,
  running: true,
  secondsPerCycle: MEOW.secondsPerCycle,

  tick: (dt) => {
    const { running, t, secondsPerCycle } = get();
    if (!running || secondsPerCycle <= 0) return;
    const nt = t + dt;
    set({ t: nt, g: 0.5 + 0.5 * Math.cos((TAU * nt) / secondsPerCycle) });
  },
  setG: (raw) => {
    const g = clamp01(raw);
    // Re-seed the oscillator at the matching descending point so a later
    // "resume auto" carries on from the scrubbed value without a pop.
    const t = (Math.acos(g * 2 - 1) / TAU) * get().secondsPerCycle;
    set({ g, t });
  },
  setRunning: (running) => set({ running }),
  setSecondsPerCycle: (secondsPerCycle) => set({ secondsPerCycle }),
}));

// Convenience selectors (avoid re-render churn by subscribing narrowly).
export const selectG = (s: GravityState) => s.g;

/** HUD copy for the current band of the dial. */
export function gravityLabel(g: number): string {
  if (g > 0.85) return "FULL SPIN";
  if (g > MEOW.lightPawG) return "SPIN-DOWN";
  if (g > MEOW.driftG) return "LIGHT PAWS";
  return "THE DRIFT";
}

// Dev affordance: expose the dial in the console so gravity can be scrubbed
// from devtools / automation (e.g. __meowGravity.getState().setG(0)).
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__meowGravity = useGravity;
}
