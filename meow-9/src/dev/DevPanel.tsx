import { Leva, useControls } from "leva";
import { useGravity } from "../world/GravityDial";
import { useObserver } from "../observer/ObserverMode";
import { MEOW } from "../world/config";
import { TIER } from "../world/device";

// Dev-only tuning chrome. This module is loaded lazily behind
// `import.meta.env.DEV` in App.tsx, so leva never ships in the prod bundle —
// tune here, then bake the winners back into config.ts / palettes.ts.

/** Leva panel wired to the GravityDial — dev tuning next to the hero slider. */
function DialControls() {
  const setG = useGravity((s) => s.setG);
  const setRunning = useGravity((s) => s.setRunning);
  const setSecondsPerCycle = useGravity((s) => s.setSecondsPerCycle);

  useControls("Gravity Dial", {
    running: { value: useGravity.getState().running, onChange: setRunning },
    "seconds / cycle": {
      value: MEOW.secondsPerCycle,
      min: 20,
      max: 600,
      step: 5,
      onChange: setSecondsPerCycle,
    },
    scrub: {
      value: MEOW.startG,
      min: 0,
      max: 1,
      step: 0.001,
      // Leva fires onChange once on init — without the guard that initial
      // call would setRunning(false) and silently kill the auto-breathe.
      onChange: (v: number, _path: string, ctx: { initial: boolean }) => {
        if (ctx.initial) return;
        useGravity.getState().setRunning(false);
        setG(v);
      },
    },
  });
  return null;
}

export default function DevPanel() {
  const observing = useObserver((s) => s.active);
  return (
    <>
      <DialControls />
      {/* Phones have no room for tuning chrome; iPads in dev sessions do. */}
      <Leva collapsed hidden={observing || TIER === "phone"} />
    </>
  );
}
