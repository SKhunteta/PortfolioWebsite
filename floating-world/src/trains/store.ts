// Train state lives in two places on purpose (the meow-9 rule: hot paths
// never go through React):
//
//   TRAINS — a plain Map mutated by the poller and advanced every frame by
//            the tween. Renderers read it inside useFrame.
//   useUi  — a small zustand store for things React actually renders:
//            the mode badge, hover label, chase target.

import { create } from "zustand";
import type { DirectionGeometry } from "../map/network";
import { CONFIG } from "../world/config";

export type Mode = "live" | "simulated" | "resting" | "connecting";

export interface TrainState {
  id: string;
  lineId: string;
  dir: DirectionGeometry;
  sTarget: number;
  sRendered: number;
  vEst: number; // km/s, smoothed — drives trail length and chase framing
  y: number; // smoothed height (dips through tunnels)
  modelL: number; // toy-scale model length (km), eased per camera distance
  farFactor: number; // 0 (camera close) .. 1 (drift distance), smoothstepped
  lastPollT: number; // CLOCK.t when sTarget last moved
  pollGapS: number;
  missedPolls: number;
  // Position-history ring for the trail: x,y,z per sample.
  trail: Float32Array;
  trailHead: number;
  trailCount: number;
  lastSampleT: number;
  dwelling: boolean;
  // Ridership as pigment (world/ridership.ts): occupancy is the real feed
  // value 0..1 when the GTFS-RT feed carries it, else null; load is the
  // smoothed effective load the trail ink reads — real when known, otherwise
  // the clock-keyed ambient estimate. Eased in the tween so a crowd arrives
  // like a wash, not a switch.
  occupancy: number | null;
  load: number;
}

export const TRAINS = new Map<string, TrainState>();

// Cap on how many trains cast a water reflection (map/Reflections.tsx); matches
// the render cap so every live train that crosses the lake shimmers.
export const MAX_TRAINS_REFLECTED = 48;

export function makeTrain(
  id: string,
  lineId: string,
  dir: DirectionGeometry,
  sKm: number,
  trailSegments: number
): TrainState {
  return {
    id,
    lineId,
    dir,
    sTarget: sKm,
    sRendered: sKm,
    vEst: 0,
    y: 0.02,
    modelL: CONFIG.train.model.farLenKm,
    farFactor: 1,
    lastPollT: 0,
    pollGapS: 10,
    missedPolls: 0,
    trail: new Float32Array(trailSegments * 3),
    trailHead: 0,
    trailCount: 0,
    lastSampleT: -1,
    dwelling: false,
    occupancy: null,
    load: 0.5, // neutral until the tween eases it toward the real target
  };
}

interface UiState {
  mode: Mode;
  fetchedAt: string | null;
  hoverStationId: string | null;
  followTrainId: string | null;
  // Chase target for the ambient SeaTac fleet: an index into Airliners' FLIGHTS
  // (the airborne jets), or null. Mutually exclusive with followTrainId — the
  // camera rides one thing at a time.
  followPlaneIndex: number | null;
  // The underground hall the camera has dived into (a station id), or null.
  // A third camera "rider", mutually exclusive with followTrainId/followPlaneIndex:
  // instead of riding a moving vehicle, the camera holds over a fixed hall's
  // platform floor so its art fresco reads up through the paper (CameraRig).
  diveStationId: string | null;
  // Ambient arrival captions ("Capitol Hill · 1 Line to Lynnwood") — set on
  // dwell EVENTS only (Stations.tsx rate-limits), never per-frame. The key
  // restarts the CSS fade when the same text repeats.
  caption: { text: string; key: number } | null;
  // True while the optional "observe" mode is sweeping the print through a
  // whole day (world/observe.ts owns the sweep; this is the React mirror).
  observing: boolean;
  // The Observe reel's current stop label ("the underground", "the cyclists",
  // "riding the jet"…) or null when the reel isn't panning. Set on stop
  // CHANGES only (CameraRig reconciles it), never per frame — the HUD's quiet
  // caption for the cinematic flight.
  observeShotLabel: string | null;
  // True while the camera is running its unattended cinematic tour of the line
  // (observer/tour.ts) — set on the tour's entry/exit transitions only, never
  // per frame. Drives the quiet "touring" hint in the HUD.
  touring: boolean;
  setMode: (mode: Mode, fetchedAt: string | null) => void;
  setHoverStation: (id: string | null) => void;
  setFollowTrain: (id: string | null) => void;
  setFollowPlane: (index: number | null) => void;
  setDiveStation: (id: string | null) => void;
  setCaption: (text: string | null) => void;
  setObserving: (observing: boolean) => void;
  setObserveShot: (label: string | null) => void;
  setTouring: (touring: boolean) => void;
}

export const useUi = create<UiState>((set) => ({
  mode: "connecting",
  fetchedAt: null,
  hoverStationId: null,
  followTrainId: null,
  followPlaneIndex: null,
  diveStationId: null,
  caption: null,
  observing: false,
  observeShotLabel: null,
  touring: false,
  setMode: (mode, fetchedAt) => set({ mode, fetchedAt }),
  setHoverStation: (hoverStationId) => set({ hoverStationId }),
  // The three camera riders (train / plane / underground dive) are exclusive —
  // engaging one releases the others. Because setFollowTrain(null) is the
  // universal "let go" call (Escape, drag, empty double-tap), clearing
  // diveStationId here means every existing exit path also rises out of a dive.
  setFollowTrain: (followTrainId) =>
    set({ followTrainId, followPlaneIndex: null, diveStationId: null }),
  setFollowPlane: (followPlaneIndex) =>
    set({ followPlaneIndex, followTrainId: null, diveStationId: null }),
  setDiveStation: (diveStationId) =>
    set({ diveStationId, followTrainId: null, followPlaneIndex: null }),
  setCaption: (text) =>
    set((s) => (text ? { caption: { text, key: (s.caption?.key ?? 0) + 1 } } : { caption: null })),
  setObserving: (observing) => set({ observing }),
  setObserveShot: (observeShotLabel) => set({ observeShotLabel }),
  setTouring: (touring) => set({ touring }),
}));
