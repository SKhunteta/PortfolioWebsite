import { create } from "zustand";
import { KETU } from "./config";

// THE HEART OF THE GAME.
// One value — `phase` in [0,1) — drives everything. Sun, sky, fog, color grade,
// aurora, sugarfields, fauna behavior. Nothing else stores "what season it is".
// Components subscribe to `phase` and derive visuals via the pure helpers in sun.ts.

interface WorldClockState {
  phase: number; // [0,1), 0 = peak Bright, 0.5 = deep Dark
  running: boolean;
  secondsPerYear: number;

  /** Advance the clock. Call once per frame with delta seconds. */
  tick: (dt: number) => void;
  /** Jump to an absolute phase (used by the scrub slider). */
  setPhase: (phase: number) => void;
  setRunning: (running: boolean) => void;
  setSecondsPerYear: (s: number) => void;
}

const wrap01 = (x: number) => ((x % 1) + 1) % 1;

export const useWorldClock = create<WorldClockState>((set, get) => ({
  phase: KETU.startPhase,
  running: true,
  secondsPerYear: KETU.secondsPerYear,

  tick: (dt) => {
    const { running, phase, secondsPerYear } = get();
    if (!running || secondsPerYear <= 0) return;
    set({ phase: wrap01(phase + dt / secondsPerYear) });
  },
  setPhase: (phase) => set({ phase: wrap01(phase) }),
  setRunning: (running) => set({ running }),
  setSecondsPerYear: (secondsPerYear) => set({ secondsPerYear }),
}));

// Convenience selectors (avoid re-render churn by subscribing narrowly).
export const selectPhase = (s: WorldClockState) => s.phase;

// Dev affordance: expose the clock in the console so the year can be scrubbed
// from devtools / automation (e.g. __ketuClock.getState().setPhase(0.5)).
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__ketuClock = useWorldClock;
}
