import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Quaternion, Vector3 } from "three";
import { create } from "zustand";
import { sampleHeight } from "../terrain/heightfield";
import { POI } from "../world/locations";
import { useWorldClock } from "../world/WorldClock";

// Observer Mode — press the button, sit back, and the world reveals itself.
// A cinematic director walks a loop of authored shots: each shot is a slow
// camera dolly (eased from->to positions with a drifting look target), a
// caption, and a target season phase. The season is driven through the ONE
// WorldClock via its public setPhase() — exactly what the scrub slider does —
// so the tour is also a tour of the year: waterfalls in the Bright, the pod at
// golden hour, the Dark falling for the finale. Exiting restores the camera and
// clock exactly as they were.

interface Shot {
  caption: string;
  sub: string;
  from: Vector3;
  to: Vector3;
  look: Vector3;
  lookDrift: Vector3; // the look target slides too, for parallax
  duration: number; // seconds
  phase: number; // target season phase for this shot
  /** How fast the season glides toward `phase` (default snappy). A small rate
   *  turns the shot into a visible timelapse — used for the Dark-falls finale. */
  phaseRate?: number;
}

interface ObserverState {
  active: boolean;
  caption: string;
  sub: string;
  fade: number; // 0 = clear, 1 = black — rendered by a DOM overlay
  /** One-frame request consumed by the director: jump straight to a shot. */
  requestShot: number | null;
  start: () => void;
  stop: () => void;
  jumpTo: (index: number) => void;
}

export const useObserver = create<ObserverState>((set) => ({
  active: false,
  caption: "",
  sub: "",
  fade: 0,
  requestShot: null,
  start: () => set({ active: true, fade: 1 }),
  stop: () => set({ active: false, fade: 0, caption: "", sub: "" }),
  jumpTo: (index) => set({ active: true, requestShot: index }),
}));

// Dev affordance, same pattern as __ketuClock: jump the tour from the console,
// e.g. __ketuObserver.getState().jumpTo(3).
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__ketuObserver = useObserver;
}

const FADE_TIME = 1.1;

/** Shortest signed distance between two phases on the [0,1) ring. */
function phaseDelta(from: number, to: number): number {
  let d = (to - from) % 1;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return d;
}

function buildShots(): Shot[] {
  // Fall B drops into a broad open channel — the one you can shoot from the sea.
  const fall = POI.waterfalls[1];
  const fallTop = sampleHeight(fall.x, fall.z);
  const sideX = -fall.dirZ; // perpendicular to the fall direction
  const sideZ = fall.dirX;
  const fallPt = (out: number, side: number, y: number) =>
    new Vector3(fall.x + fall.dirX * out + sideX * side, y, fall.z + fall.dirZ * out + sideZ * side);

  const pool = POI.leviathanPool;
  const peak = POI.eaglePeak;
  const ridge = POI.bearRidge;
  const ridgeH = sampleHeight(ridge.x, ridge.z);

  return [
    {
      caption: "KETU-9",
      sub: "The Splinterlands, late in the Bright",
      from: new Vector3(-2800, 950, 3600),
      to: new Vector3(-900, 620, 2300),
      look: new Vector3(0, 120, 0),
      lookDrift: new Vector3(200, -40, -300),
      duration: 16,
      phase: 0.04,
    },
    {
      // Aerial three-quarter view: the channel is studded with islets (max
      // ~250 m), so the camera stays high and looks down the full ribbon.
      caption: "Meltwater",
      sub: `A ${Math.round(fallTop)}-meter fall off the fjord wall`,
      from: fallPt(560, -150, 300),
      to: fallPt(320, -50, 210),
      look: new Vector3(fall.x, fallTop * 0.48, fall.z),
      lookDrift: new Vector3(0, -30, 0),
      duration: 16,
      phase: 0.08,
    },
    {
      // Camera sits sunward-opposite so the pod surfaces inside the glint lane.
      caption: "The Pod",
      sub: "Eight-limbed leviathans, surfacing at the hinge",
      from: new Vector3(3080, 110, 200),
      to: new Vector3(3850, 40, -300),
      look: new Vector3(pool.x, 0, pool.z),
      lookDrift: new Vector3(40, 8, -40),
      duration: 20,
      phase: 0.15,
    },
    {
      caption: "Stormwings",
      sub: "Four-winged riders on the summit thermal",
      from: new Vector3(peak.x + 420, peak.summit + 330, peak.z + 200),
      to: new Vector3(peak.x + 140, peak.summit + 230, peak.z - 190),
      look: new Vector3(peak.x, peak.summit + 200, peak.z),
      lookDrift: new Vector3(0, 25, 0),
      duration: 16,
      phase: 0.1,
    },
    {
      caption: "Glassbears",
      sub: "Seen only by the way they bend the ice",
      from: new Vector3(ridge.x - 95, ridgeH + 9, ridge.z + 70),
      to: new Vector3(ridge.x + 65, ridgeH + 6, ridge.z + 48),
      look: new Vector3(ridge.x, ridgeH + 2, ridge.z),
      lookDrift: new Vector3(10, 0, -12),
      duration: 18,
      phase: 0.06,
    },
    {
      // Finale: a slow timelapse — the whole shot is the sun leaving. Rate is
      // tuned so sunset lands mid-shot and a twilight band survives to the
      // cut; the loop then fades from that indigo back into peak Bright.
      caption: "The Long Cold",
      sub: "The sun will not rise again for a long time",
      from: new Vector3(-2600, 280, 1500),
      to: new Vector3(-3450, 720, 2150),
      look: new Vector3(0, 280, -400),
      lookDrift: new Vector3(0, 90, 0),
      duration: 22,
      phase: 0.26,
      phaseRate: 0.125,
    },
  ];
}

const easeInOut = (t: number) => t * t * (3 - 2 * t);

export function ObserverMode() {
  const { camera } = useThree();
  const shots = useMemo(buildShots, []);

  const state = useRef({
    wasActive: false,
    shotIndex: 0,
    shotTime: 0,
    savedPos: new Vector3(),
    savedQuat: new Quaternion(),
    savedPhase: 0,
    savedRunning: true,
    tourPhase: 0,
  });

  const lookTarget = useRef(new Vector3());

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const s = state.current;
    const active = useObserver.getState().active;
    const clock = useWorldClock.getState();

    // --- Enter: save the player's camera + clock so exit is seamless. -------
    if (active && !s.wasActive) {
      s.wasActive = true;
      s.shotIndex = 0;
      s.shotTime = 0;
      s.savedPos.copy(camera.position);
      s.savedQuat.copy(camera.quaternion);
      s.savedPhase = clock.phase;
      s.savedRunning = clock.running;
      s.tourPhase = clock.phase;
      clock.setRunning(false);
    }
    if (!active && s.wasActive) {
      s.wasActive = false;
      camera.position.copy(s.savedPos);
      camera.quaternion.copy(s.savedQuat);
      clock.setPhase(s.savedPhase);
      clock.setRunning(s.savedRunning);
      return;
    }
    if (!active) return;

    // Honor a jump request (dev console / future deep links): hard-cut to the
    // shot, season snapped so there's no cross-world phase glide.
    const requested = useObserver.getState().requestShot;
    if (requested !== null) {
      s.shotIndex = ((requested % shots.length) + shots.length) % shots.length;
      s.shotTime = 0.01;
      s.tourPhase = shots[s.shotIndex].phase;
      useObserver.setState({ requestShot: null });
    }

    const shot = shots[s.shotIndex];
    s.shotTime += dt;
    if (s.shotTime >= shot.duration) {
      s.shotIndex = (s.shotIndex + 1) % shots.length;
      s.shotTime = 0;
    }
    const current = shots[s.shotIndex];
    const t = s.shotTime / current.duration;

    // Camera: eased dolly with a drifting look target (cheap parallax).
    const e = easeInOut(t);
    camera.position.lerpVectors(current.from, current.to, e);
    lookTarget.current
      .copy(current.look)
      .addScaledVector(current.lookDrift, e);
    camera.lookAt(lookTarget.current);

    // Season: glide the ONE WorldClock toward the shot's phase (same public
    // API as the scrub slider). Reads as a gentle timelapse between shots.
    const d = phaseDelta(s.tourPhase, current.phase);
    s.tourPhase += d * Math.min(1, dt * (current.phaseRate ?? 1.4));
    clock.setPhase(s.tourPhase);

    // Fade to black at shot boundaries; caption follows the current shot.
    const untilEnd = current.duration - s.shotTime;
    const fade = Math.max(
      0,
      Math.max(1 - s.shotTime / FADE_TIME, 1 - untilEnd / FADE_TIME)
    );
    const store = useObserver.getState();
    if (store.caption !== current.caption || Math.abs(store.fade - fade) > 0.01) {
      useObserver.setState({ caption: current.caption, sub: current.sub, fade });
    }
  });

  return null;
}
