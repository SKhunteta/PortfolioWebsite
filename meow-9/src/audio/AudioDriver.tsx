import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGravity } from "../world/GravityDial";
import { audioReady, setHumLevel, setWhoosh, unlockAudio } from "./engine";

// Bridges the GravityDial to the soundscape, once per frame (a sibling of
// DialDriver). Also owns the one-time gesture unlock: the first pointer or
// key anywhere starts the station hum — autoplay policy satisfied.

export function AudioDriver() {
  const prev = useRef({ g: -1, whoosh: 0, primed: false });

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    if (dt <= 0) return;
    const g = useGravity.getState().g;
    const p = prev.current;
    if (p.g < 0) p.g = g; // first frame: no phantom whoosh
    // The hum's gain boots at 0 — push the current dial level once the
    // context unlocks, even if the dial never moves (reduced motion).
    if (!p.primed && audioReady()) {
      p.primed = true;
      setHumLevel(g);
    }
    // Smooth the rate a touch so slider steps read as one continuous scrub.
    const rate = Math.abs(g - p.g) / dt;
    p.whoosh += (rate - p.whoosh) * Math.min(1, 8 * dt);
    // Only touch WebAudio params on real movement; setTargetAtTime smooths.
    if (Math.abs(g - p.g) > 0.0005 || p.whoosh > 0.001) {
      setHumLevel(g);
      setWhoosh(p.whoosh);
    }
    p.g = g;
  });
  return null;
}
