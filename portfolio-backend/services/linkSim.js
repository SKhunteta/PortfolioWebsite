// Deterministic Link light-rail simulator for The Link, Alive.
//
// When the GTFS-RT feed is unavailable (no key, upstream outage, stale or
// empty feed) the /api/linkmap route synthesizes plausible trains from the
// baked schedule (data/linkmap-schedule.json). Everything here is a pure
// function of (schedule, epochMs): two polls at nearby instants see the same
// train ids gliding forward, which the frontend tween depends on.

const DAY_MIN = 24 * 60;

const laFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  weekday: "short",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const BUCKET_BY_WEEKDAY = {
  Sat: "saturday",
  Sun: "sunday",
  Mon: "weekday",
  Tue: "weekday",
  Wed: "weekday",
  Thu: "weekday",
  Fri: "weekday",
};

// Seattle wall-clock context for an instant: minutes into the local day,
// the service-day bucket, and a date key for stable train ids. DST-safe —
// Intl does the zone math.
export function laClock(epochMs) {
  const parts = {};
  for (const p of laFormatter.formatToParts(epochMs)) parts[p.type] = p.value;
  // Intl emits hour "24" at midnight for some hourCycles; normalize.
  const hour = Number(parts.hour) % 24;
  return {
    minutes: hour * 60 + Number(parts.minute) + Number(parts.second) / 60,
    dayBucket: BUCKET_BY_WEEKDAY[parts.weekday] || "weekday",
    dateKey: `${parts.year}${parts.month}${parts.day}`,
  };
}

function interpolatePosition(direction, sKm) {
  const { polyline, cumKm } = direction;
  const total = cumKm[cumKm.length - 1];
  const s = Math.max(0, Math.min(total, sKm));
  let lo = 0;
  let hi = cumKm.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cumKm[mid] <= s) lo = mid;
    else hi = mid;
  }
  const span = cumKm[hi] - cumKm[lo];
  const t = span > 0 ? (s - cumKm[lo]) / span : 0;
  const [lat1, lng1] = polyline[lo];
  const [lat2, lng2] = polyline[hi];
  const lat = lat1 + (lat2 - lat1) * t;
  const lng = lng1 + (lng2 - lng1) * t;
  // Bearing from the segment tangent (degrees clockwise from north).
  const dLat = lat2 - lat1;
  const dLng = (lng2 - lng1) * Math.cos((lat * Math.PI) / 180);
  const heading = ((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360;
  return { lat, lng, heading };
}

// Where along the run is a train that departed elapsedSec ago? Model:
// depart station 0, run runSecToNext, dwell dwellSec at the next station,
// repeat. Returns null once the run is complete.
export function positionAlongRun(stations, elapsedSec) {
  if (elapsedSec < 0) return null;
  let t = elapsedSec;
  for (let i = 0; i < stations.length - 1; i++) {
    const run = stations[i].runSecToNext ?? 120;
    const lastLeg = i === stations.length - 2;
    // The arrival instant of the final leg still counts as "on the line".
    if (t < run || (lastLeg && t === run)) {
      const f = run > 0 ? t / run : 1;
      return {
        sKm: stations[i].sKm + (stations[i + 1].sKm - stations[i].sKm) * f,
        dwelling: false,
      };
    }
    t -= run;
    const isLast = i + 1 === stations.length - 1;
    const dwell = isLast ? 0 : (stations[i + 1].dwellSec ?? 25);
    if (t < dwell) {
      return { sKm: stations[i + 1].sKm, dwelling: true };
    }
    t -= dwell;
  }
  return null;
}

export function totalRunSec(stations) {
  let total = 0;
  for (let i = 0; i < stations.length - 1; i++) {
    total += stations[i].runSecToNext ?? 120;
    if (i + 1 < stations.length - 1) total += stations[i + 1].dwellSec ?? 25;
  }
  return total;
}

function* departures(bands, untilMin) {
  for (const band of bands) {
    for (let t = band.startMin; t < band.endMin && t <= untilMin; t += band.headwayMin) {
      yield t;
    }
  }
}

function simulateServiceDay(schedule, dayBucket, dateKey, nowMin, epochMs) {
  const vehicles = [];
  const directionsByLine = new Map(
    schedule.lines.map((l) => [l.id, new Map(l.directions.map((d) => [d.directionId, d]))])
  );
  for (const pattern of schedule.service) {
    if (pattern.dayBucket !== dayBucket) continue;
    const direction = directionsByLine.get(pattern.lineId)?.get(pattern.directionId);
    if (!direction || direction.stations.length < 2) continue;
    const journeySec = totalRunSec(direction.stations);
    for (const t0 of departures(pattern.bands, nowMin)) {
      const elapsedSec = (nowMin - t0) * 60;
      if (elapsedSec > journeySec) continue;
      const pos = positionAlongRun(direction.stations, elapsedSec);
      if (!pos) continue;
      const { lat, lng, heading } = interpolatePosition(direction, pos.sKm);
      vehicles.push({
        id: `sim-${pattern.lineId}-${pattern.directionId}-${dateKey}-${Math.round(t0)}`,
        line: pattern.lineId,
        lat: Number(lat.toFixed(6)),
        lon: Number(lng.toFixed(6)),
        heading: Number(heading.toFixed(1)),
        dwelling: pos.dwelling,
        timestamp: Math.floor(epochMs / 1000),
      });
    }
  }
  return vehicles;
}

// All plausible trains at an instant. Evaluates today's service day and
// yesterday's (GTFS >24:00 owl trips are still en route after midnight).
export function simulateVehicles(schedule, epochMs) {
  const today = laClock(epochMs);
  const yesterday = laClock(epochMs - DAY_MIN * 60 * 1000);
  const vehicles = simulateServiceDay(
    schedule,
    today.dayBucket,
    today.dateKey,
    today.minutes,
    epochMs
  );
  if (yesterday.dateKey !== today.dateKey) {
    vehicles.push(
      ...simulateServiceDay(
        schedule,
        yesterday.dayBucket,
        yesterday.dateKey,
        today.minutes + DAY_MIN,
        epochMs
      )
    );
  }
  return vehicles;
}

// Is any service scheduled right now? Distinguishes "resting" (intentionally
// dark, e.g. 3am) from "simulated" (service expected, feed unavailable).
export function serviceActive(schedule, epochMs) {
  const today = laClock(epochMs);
  const inBands = (bucket, minutes) =>
    schedule.service.some(
      (p) =>
        p.dayBucket === bucket &&
        p.bands.some((b) => minutes >= b.startMin && minutes < b.endMin)
    );
  if (inBands(today.dayBucket, today.minutes)) return true;
  const yesterday = laClock(epochMs - DAY_MIN * 60 * 1000);
  if (inBands(yesterday.dayBucket, today.minutes + DAY_MIN)) return true;
  // Bands cover departures; a last train of the night is still a live run
  // after its band closes.
  return simulateVehicles(schedule, epochMs).length > 0;
}
