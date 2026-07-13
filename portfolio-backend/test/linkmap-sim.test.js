/** Link simulator — determinism, dwell, timezone, and service-window invariants. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  laClock,
  positionAlongRun,
  totalRunSec,
  simulateVehicles,
  serviceActive,
} from "../services/linkSim.js";

// A straight 3-station toy line: 0 km -> 2 km -> 4 km, 200s runs, 30s dwell.
const STATIONS = [
  { id: "A", name: "Alpha", sKm: 0, dwellSec: 30, runSecToNext: 200 },
  { id: "B", name: "Beta", sKm: 2, dwellSec: 30, runSecToNext: 200 },
  { id: "C", name: "Gamma", sKm: 4, dwellSec: 30, runSecToNext: null },
];

const SCHEDULE = {
  lines: [
    {
      id: "1LINE",
      name: "1 Line",
      directions: [
        {
          directionId: 0,
          headsign: "Gamma",
          polyline: [
            [47.6, -122.33],
            [47.62, -122.33],
            [47.64, -122.33],
          ],
          cumKm: [0, 2, 4],
          stations: STATIONS,
        },
      ],
    },
  ],
  service: [
    {
      lineId: "1LINE",
      directionId: 0,
      dayBucket: "weekday",
      // 08:00-10:00, every 10 minutes.
      bands: [{ startMin: 480, endMin: 600, headwayMin: 10 }],
    },
    {
      lineId: "1LINE",
      directionId: 0,
      dayBucket: "weekday",
      // Owl band crossing midnight: 25:00-25:30 (1am-1:30am next calendar day).
      bands: [{ startMin: 1500, endMin: 1530, headwayMin: 15 }],
    },
  ],
};

// Fixed instants (America/Los_Angeles):
const PDT_0830 = Date.UTC(2026, 6, 15, 15, 30, 0); // Wed Jul 15 2026 08:30 PDT
const PST_0830 = Date.UTC(2026, 0, 14, 16, 30, 0); // Wed Jan 14 2026 08:30 PST
const PDT_0300 = Date.UTC(2026, 6, 15, 10, 0, 0); //  Wed Jul 15 2026 03:00 PDT
const PDT_0105 = Date.UTC(2026, 6, 15, 8, 5, 0); //   Wed Jul 15 2026 01:05 PDT

test("laClock converts UTC to Seattle wall time in both DST regimes", () => {
  assert.equal(Math.round(laClock(PDT_0830).minutes), 510);
  assert.equal(laClock(PDT_0830).dayBucket, "weekday");
  assert.equal(Math.round(laClock(PST_0830).minutes), 510);
  assert.equal(laClock(PST_0830).dateKey, "20260114");
});

test("positionAlongRun walks run/dwell segments and ends", () => {
  assert.equal(positionAlongRun(STATIONS, 0).sKm, 0);
  assert.equal(positionAlongRun(STATIONS, 100).sKm, 1); // halfway A->B
  const dwell = positionAlongRun(STATIONS, 210);
  assert.equal(dwell.sKm, 2); // dwelling at B
  assert.equal(dwell.dwelling, true);
  assert.equal(positionAlongRun(STATIONS, 230 + 100).sKm, 3); // halfway B->C
  assert.equal(positionAlongRun(STATIONS, totalRunSec(STATIONS)).sKm, 4);
  assert.equal(positionAlongRun(STATIONS, totalRunSec(STATIONS) + 1), null);
});

test("simulates the expected fleet mid-band", () => {
  const vehicles = simulateVehicles(SCHEDULE, PDT_0830);
  // Departures 08:00/08:10/08:20/08:30; journey is 430s (~7.2 min), so the
  // 08:00/08:10/08:20 runs are done or nearly done and 08:30 just left.
  assert.ok(vehicles.length >= 1 && vehicles.length <= 3, `got ${vehicles.length}`);
  for (const v of vehicles) {
    assert.equal(v.line, "1LINE");
    assert.ok(v.lat >= 47.6 && v.lat <= 47.64);
    assert.equal(v.lon, -122.33);
  }
});

test("is deterministic and ids are stable across nearby polls", () => {
  const a = simulateVehicles(SCHEDULE, PDT_0830);
  const b = simulateVehicles(SCHEDULE, PDT_0830);
  assert.deepEqual(a, b);
  const later = simulateVehicles(SCHEDULE, PDT_0830 + 10_000);
  const stable = later.filter((v) => a.some((w) => w.id === v.id));
  assert.ok(stable.length >= 1, "at least one train persists across a 10s poll");
});

test("trains advance monotonically along the line between polls", () => {
  const t0 = PDT_0830;
  const a = simulateVehicles(SCHEDULE, t0);
  const b = simulateVehicles(SCHEDULE, t0 + 30_000);
  for (const v of a) {
    const w = b.find((x) => x.id === v.id);
    if (!w) continue; // run completed
    assert.ok(w.lat >= v.lat - 1e-9, `${v.id} moved backwards`);
  }
});

test("3am is resting, not simulated", () => {
  assert.equal(serviceActive(SCHEDULE, PDT_0300), false);
  assert.equal(simulateVehicles(SCHEDULE, PDT_0300).length, 0);
});

test("owl trips from yesterday's >24h band still run after midnight", () => {
  // 01:05 falls inside yesterday's 1500-1530 band (25:00-25:30); the 01:00
  // departure (t0=1500) is 5 minutes into its ~7-minute run.
  assert.equal(serviceActive(SCHEDULE, PDT_0105), true);
  const vehicles = simulateVehicles(SCHEDULE, PDT_0105);
  assert.ok(vehicles.length >= 1, "owl train present");
  assert.match(vehicles[0].id, /sim-1LINE-0-20260714-/); // yesterday's date key
});

test("weekend buckets do not leak into weekdays", () => {
  const satOnly = {
    ...SCHEDULE,
    service: [{ ...SCHEDULE.service[0], dayBucket: "saturday" }],
  };
  assert.equal(simulateVehicles(satOnly, PDT_0830).length, 0); // Wednesday
});
