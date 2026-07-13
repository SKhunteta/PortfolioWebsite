// Polls /api/linkmap/vehicles every ~10s (the backend's cache TTL — more
// often would just hit the same cache) and folds positions into TRAINS.
// Lat/lon snaps to (direction, sKm) with the previous position as a hint so
// a fix never lands on the wrong fold of the line. Pauses while the tab is
// hidden; polls immediately on return.

import { LINE_BY_ID, nearestS, projectLatLng, DirectionGeometry } from "../map/network";
import { CONFIG } from "../world/config";
import { PROFILE } from "../world/device";
import { CLOCK } from "../world/clock";
import { TRAINS, makeTrain, useUi, Mode } from "./store";

interface ApiVehicle {
  id: string;
  line: string;
  lat: number;
  lon: number;
  heading?: number | null;
  dwelling?: boolean;
  timestamp: number;
}

interface ApiResponse {
  mode: Mode;
  vehicles: ApiVehicle[];
  fetchedAt: string;
}

function apiBase(): string {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1"
    ? "http://localhost:3001"
    : "https://backend.builtbyshrey.com";
}

function bestSnap(
  directions: DirectionGeometry[],
  x: number,
  z: number,
  preferred?: DirectionGeometry,
  sHint?: number
): { dir: DirectionGeometry; sKm: number; distKm: number } | null {
  if (preferred && sHint != null) {
    const hinted = nearestS(preferred, x, z, sHint, CONFIG.tween.snapWindowKm);
    if (hinted.distKm <= CONFIG.tween.rejectSnapKm) {
      return { dir: preferred, ...hinted };
    }
  }
  let best: { dir: DirectionGeometry; sKm: number; distKm: number } | null = null;
  for (const dir of directions) {
    const snap = nearestS(dir, x, z);
    if (snap.distKm <= CONFIG.tween.rejectSnapKm && (!best || snap.distKm < best.distKm)) {
      best = { dir, ...snap };
    }
  }
  return best;
}

function fold(payload: ApiResponse) {
  const seen = new Set<string>();
  for (const v of payload.vehicles) {
    const line = LINE_BY_ID.get(v.line);
    if (!line) continue;
    const { x, z } = projectLatLng(v.lat, v.lon);
    const existing = TRAINS.get(v.id);

    if (existing) {
      const snap = bestSnap(line.directions, x, z, existing.dir, existing.sRendered);
      if (!snap) continue;
      seen.add(v.id);
      // A target sliding backwards twice means we guessed the wrong
      // direction at spawn — flip to the better-fitting one.
      if (snap.dir !== existing.dir) {
        existing.dir = snap.dir;
        existing.sRendered = snap.sKm;
        existing.trailCount = 0;
      }
      existing.pollGapS = Math.max(2, CLOCK.t - existing.lastPollT) || 10;
      existing.lastPollT = CLOCK.t;
      existing.sTarget = snap.sKm;
      existing.dwelling = Boolean(v.dwelling);
      existing.missedPolls = 0;
    } else {
      const snap = bestSnap(line.directions, x, z);
      if (!snap) continue;
      seen.add(v.id);
      const train = makeTrain(v.id, v.line, snap.dir, snap.sKm, PROFILE.trailSegments);
      train.lastPollT = CLOCK.t;
      train.dwelling = Boolean(v.dwelling);
      TRAINS.set(v.id, train);
    }
  }

  for (const [id, train] of TRAINS) {
    if (seen.has(id)) continue;
    // Grace of one missed poll — feeds flicker.
    if (++train.missedPolls >= 2) TRAINS.delete(id);
  }

  useUi.getState().setMode(payload.mode, payload.fetchedAt);
}

export function startPoller(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let failures = 0;

  const schedule = (delay: number) => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(poll, delay);
  };

  const poll = async () => {
    if (stopped) return;
    if (document.hidden) return; // visibilitychange re-arms us
    try {
      const res = await fetch(`${apiBase()}/api/linkmap/vehicles`, {
        signal: AbortSignal.timeout(9000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fold((await res.json()) as ApiResponse);
      failures = 0;
      schedule(CONFIG.poll.intervalMs);
    } catch {
      // Backend unreachable (e.g. keyless dev without the server running):
      // show the resting state honestly and keep trying, slower.
      const backoff =
        CONFIG.poll.backoffMs[Math.min(failures, CONFIG.poll.backoffMs.length - 1)];
      failures++;
      if (failures >= 2 && useUi.getState().mode === "connecting") {
        useUi.getState().setMode("resting", null);
      }
      schedule(backoff);
    }
  };

  const onVisibility = () => {
    if (!document.hidden) poll();
  };
  document.addEventListener("visibilitychange", onVisibility);
  poll();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
