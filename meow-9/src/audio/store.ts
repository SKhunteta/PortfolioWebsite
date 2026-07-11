import { create } from "zustand";
import { setMuted, unlockAudio } from "./engine";

// Sound UI state — one pill, one bit. Un-muting counts as a user gesture, so
// it doubles as an unlock point for visitors who never clicked the canvas.

interface SoundState {
  muted: boolean;
  toggle: () => void;
}

export const useSound = create<SoundState>((set, get) => ({
  muted: false,
  toggle: () => {
    const muted = !get().muted;
    set({ muted });
    if (!muted) unlockAudio();
    setMuted(muted);
  },
}));

// Dev affordance, same pattern as __meowGravity.
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__meowSound = useSound;
}
