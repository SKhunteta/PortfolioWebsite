// Live arrivals, derived from the very trains gliding on the map — not a
// separate feed. Honesty is part of the piece: the "3 min" you read is the
// glowing train you can watch approach, so it's automatically right in live
// AND simulated mode, and honestly empty when the network rests.
//
// For each of a station's arc-length marks we find trains on the same
// (line, direction) that haven't passed it yet, and turn the remaining
// distance into a time using the train's on-screen smoothed speed (vEst).

import { LINES, LINE_BY_ID } from "../map/network";
import { TRAINS } from "../trains/store";
import { CONFIG } from "../world/config";

export interface Arrival {
  lineId: string;
  lineName: string;
  color: string;
  headsign: string;
  etaS: number; // seconds until it reaches the station mark
  arriving: boolean; // within dwell distance — "arriving" rather than a count
}

interface Mark {
  lineId: string;
  directionId: number;
  headsign: string;
  sKm: number;
}

// station id -> the arc marks where lines touch it (same data Stations.tsx
// uses for dwell, indexed here for the arrivals lookup). Built once.
const MARKS_BY_STATION: Map<string, Mark[]> = (() => {
  const map = new Map<string, Mark[]>();
  for (const line of LINES) {
    for (const dir of line.directions) {
      for (const st of dir.stations) {
        const arr = map.get(st.id) ?? [];
        arr.push({
          lineId: line.id,
          directionId: dir.directionId,
          headsign: dir.headsign,
          sKm: st.sKm,
        });
        map.set(st.id, arr);
      }
    }
  }
  return map;
})();

export function stationHasMarks(stationId: string): boolean {
  return MARKS_BY_STATION.has(stationId);
}

// Don't estimate off a near-stationary train — tiny speed blows the ETA up to
// nonsense. Below this we only report it if it's already at the platform.
const MIN_SPEED_KM_S = CONFIG.tween.vNominalKmS * 0.15;
// Look about 25 minutes up the line; past that it isn't "arriving" yet.
const HORIZON_S = 25 * 60;

/**
 * Next arrivals for a station, nearest first — one entry per (line,
 * direction), so the two platforms of a through-station read as two lines.
 */
export function arrivalsForStation(stationId: string): Arrival[] {
  const marks = MARKS_BY_STATION.get(stationId);
  if (!marks) return [];

  // Best (soonest) candidate per line+direction.
  const best = new Map<string, Arrival>();

  for (const mark of marks) {
    for (const train of TRAINS.values()) {
      if (train.lineId !== mark.lineId) continue;
      if (train.dir.directionId !== mark.directionId) continue;

      const gapKm = mark.sKm - train.sRendered;
      const arriving = Math.abs(gapKm) <= CONFIG.train.dwellStationKm;

      let etaS: number;
      if (arriving) {
        etaS = 0;
      } else if (gapKm <= 0) {
        continue; // already passed this station on this run
      } else if (train.vEst < MIN_SPEED_KM_S) {
        continue; // stopped elsewhere — can't honestly estimate
      } else {
        etaS = gapKm / train.vEst;
        if (etaS > HORIZON_S) continue;
      }

      const key = `${mark.lineId}:${mark.directionId}`;
      const prev = best.get(key);
      if (!prev || etaS < prev.etaS) {
        const line = LINE_BY_ID.get(mark.lineId);
        best.set(key, {
          lineId: mark.lineId,
          lineName: line?.name ?? "Link",
          color: line?.color ?? "#8a7355",
          headsign: mark.headsign,
          etaS,
          arriving,
        });
      }
    }
  }

  return [...best.values()].sort((a, b) => a.etaS - b.etaS);
}

/** "arriving" / "1 min" / "7 min" for the board. */
export function formatEta(a: Arrival): string {
  if (a.arriving || a.etaS < 30) return "arriving";
  return `${Math.round(a.etaS / 60)} min`;
}
