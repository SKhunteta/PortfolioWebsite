// The live Metro bus poller: hits /api/metro/vehicles on the linkmap cadence
// (10 s, matching the backend cache TTL) and folds fixes into a plain Map the
// render layer reads inside useFrame — the hot path never touches React, and
// this store is deliberately NOT zustand (nothing here is UI state).
//
// Honesty contract: mode "live" means real GTFS-RT coaches are on the page
// (an empty 3am feed is still live — the owl network really is that thin).
// Any failure — keyless dev, outage, staleness, unreachable backend — parks
// the layer in "ambient" and map/Buses.tsx falls back to its deterministic
// painted fleet, the pre-live behavior, clearly stylized and never presented
// as live. `?buses=` pins: off hides the layer, 0..1 forces the ambient
// fleet at that service level, live forces live-only (no ambient fallback).
//
// The same hostname-based base URL as trains/poller.ts (localhost dev →
// localhost:3001, deployed → backend.builtbyshrey.com); the Link poller's
// contract file stays untouched — this is a different endpoint, not a fork.

import { projectLatLng } from "../map/network";
import { CONFIG } from "../world/config";
import {
  ApiBus,
  MetroPayload,
  articFor,
  busRank,
  liveryFor,
  onPage,
  yawFromBearing,
} from "./metroBuses";

export interface LiveBus {
  id: string;
  x: number; // rendered position (glides toward the fix)
  z: number;
  targetX: number; // latest projected fix
  targetZ: number;
  yaw: number;
  hasBearing: boolean;
  livery: number; // LIVERY_* — fixed per coach
  artic: number; // 1 = 60-foot articulated (RapidRide always; else hashed)
  rank: number; // 0..1 place in the crowd rule's thinning order — fixed per coach
  fade: number; // eases 0→1 on spawn, back toward 0 when thinned away
  missedPolls: number;
}

export type BusMode = "connecting" | "live" | "ambient";

// Read in useFrame every frame; mutated only by the poller below.
export const LIVE_BUSES = new Map<string, LiveBus>();
export const BUS_FEED: { mode: BusMode } = { mode: "connecting" };

// --- ?buses= pin ------------------------------------------------------------
// off        hide the whole layer (both modes)
// 0..1       force the AMBIENT fleet at that pinned service level
// live       force live-only: never fall back to the ambient fleet
// all        live-only AND every coach on the page — the crowd rule off
export type BusPin =
  | { kind: "none" }
  | { kind: "off" }
  | { kind: "ambient"; level: number }
  | { kind: "live" }
  | { kind: "all" };

export function parseBusPin(raw: string | null): BusPin {
  if (raw == null) return { kind: "none" };
  if (raw === "off") return { kind: "off" };
  if (raw === "live") return { kind: "live" };
  if (raw === "all") return { kind: "all" };
  const n = Number(raw);
  if (Number.isFinite(n)) return { kind: "ambient", level: Math.max(0, Math.min(1, n)) };
  return { kind: "none" };
}

export const BUS_PIN: BusPin =
  typeof window === "undefined"
    ? { kind: "none" }
    : parseBusPin(new URLSearchParams(window.location.search).get("buses"));

function apiBase(): string {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1"
    ? "http://localhost:3001"
    : "https://backend.builtbyshrey.com";
}

function fold(payload: MetroPayload) {
  if (payload.mode !== "live") {
    BUS_FEED.mode = "ambient";
    LIVE_BUSES.clear();
    return;
  }
  const seen = new Set<string>();
  for (const v of payload.vehicles as ApiBus[]) {
    const { x, z } = projectLatLng(v.lat, v.lon);
    if (!onPage(x, z)) continue; // beyond the painted sheet
    seen.add(v.id);
    const existing = LIVE_BUSES.get(v.id);
    if (existing) {
      // Derive a heading from the move when the feed doesn't carry one and
      // the coach actually went somewhere (> ~25 m — under that it's noise).
      const dx = x - existing.targetX;
      const dz = z - existing.targetZ;
      if (v.hdg != null) {
        existing.yaw = yawFromBearing(v.hdg);
        existing.hasBearing = true;
      } else if (Math.hypot(dx, dz) > 0.025) {
        existing.yaw = Math.atan2(-dz, dx);
      }
      existing.targetX = x;
      existing.targetZ = z;
      existing.missedPolls = 0;
    } else {
      LIVE_BUSES.set(v.id, {
        id: v.id,
        x,
        z,
        targetX: x,
        targetZ: z,
        yaw: v.hdg != null ? yawFromBearing(v.hdg) : 0,
        hasBearing: v.hdg != null,
        livery: liveryFor(v.id, v.rr === 1),
        artic: articFor(v.id, v.rr === 1) ? 1 : 0,
        rank: busRank(v.id, v.rr === 1, CONFIG.bus.crowd.rapidRideBias),
        fade: 0,
        missedPolls: 0,
      });
    }
  }
  for (const [id, bus] of LIVE_BUSES) {
    if (seen.has(id)) continue;
    if (++bus.missedPolls >= 2) LIVE_BUSES.delete(id); // grace of one — feeds flicker
  }
  BUS_FEED.mode = "live";
}

export function startBusPoller(): () => void {
  // A pin that forecloses live data means never fetching at all.
  if (BUS_PIN.kind === "off" || BUS_PIN.kind === "ambient") {
    BUS_FEED.mode = "ambient";
    return () => {};
  }

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
      const res = await fetch(`${apiBase()}/api/metro/vehicles`, {
        signal: AbortSignal.timeout(9000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fold((await res.json()) as MetroPayload);
      failures = 0;
      schedule(CONFIG.poll.intervalMs);
    } catch {
      failures++;
      if (failures >= 2 && BUS_FEED.mode !== "live") {
        BUS_FEED.mode = "ambient";
      }
      const backoff =
        CONFIG.poll.backoffMs[Math.min(failures, CONFIG.poll.backoffMs.length - 1)];
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
