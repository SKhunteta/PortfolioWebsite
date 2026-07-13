// GTFS pipeline tests — synthetic in-memory feed, no network, no zip.
import { describe, it, expect } from "vitest";
import {
  PROJECTION,
  projectPoint,
  parseGtfsCsv,
  parseGtfsTime,
  dedupePoints,
  cumulativeKm,
  douglasPeuckerIndices,
  snapToPolylineKm,
  normalizeStationName,
  deriveHeadwayBands,
  processGtfs,
} from "../build-link-network.mjs";

// A tiny two-line feed: a 3-station light-rail "1 Line" running roughly
// north-south near downtown Seattle, plus a bus route and a T Line that the
// pipeline must filter out. Stop names contain commas (real CSV parsing).
const FIXTURE = {
  "routes.txt": [
    "route_id,route_short_name,route_long_name,route_type,route_color",
    "1LINE,1 Line,Lynnwood - Federal Way,0,3DAE2B",
    "TLINE,T Line,Tacoma,0,F38B00",
    "550,550,Bellevue - Seattle,3,4C4C4C",
  ].join("\n"),
  "stops.txt": [
    "stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station",
    'S1,"Alpha Station, North",47.6500,-122.3321,1,',
    "S1P,Alpha Platform,47.6500,-122.3321,0,S1",
    "S2,Beta,47.6200,-122.3321,1,",
    "S2P,Beta Platform,47.6200,-122.3321,0,S2",
    "S3,Gamma,47.6000,-122.3321,1,",
    "S3P,Gamma Platform,47.6000,-122.3321,0,S3",
  ].join("\n"),
  "shapes.txt": [
    "shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence",
    "SH0,47.6500,-122.3321,1",
    "SH0,47.6500,-122.3321,2", // consecutive duplicate — must be deduped
    "SH0,47.6350,-122.3321,3",
    "SH0,47.6200,-122.3321,4",
    "SH0,47.6000,-122.3321,5",
    "SH1,47.6000,-122.3321,1",
    "SH1,47.6200,-122.3321,2",
    "SH1,47.6500,-122.3321,3",
  ].join("\n"),
  "trips.txt": [
    "route_id,service_id,trip_id,direction_id,shape_id,trip_headsign",
    "1LINE,WK,T1,0,SH0,Gamma",
    "1LINE,WK,T2,0,SH0,Gamma",
    "1LINE,WK,T3,0,SH0,Gamma",
    "1LINE,WK,T4,0,SH0,Gamma", // after-midnight trip (>24:00)
    "1LINE,SAT,T5,0,SH0,Gamma",
    "1LINE,WK,T6,1,SH1,Alpha",
  ].join("\n"),
  "stop_times.txt": [
    "trip_id,arrival_time,departure_time,stop_id,stop_sequence",
    "T1,08:00:00,08:00:30,S1P,1",
    "T1,08:04:00,08:04:30,S2P,2",
    "T1,08:08:00,08:08:00,S3P,3",
    "T2,08:20:00,08:20:30,S1P,1",
    "T2,08:24:00,08:24:30,S2P,2",
    "T2,08:28:00,08:28:00,S3P,3",
    "T3,08:40:00,08:40:30,S1P,1",
    "T3,08:44:00,08:44:30,S2P,2",
    "T3,08:48:00,08:48:00,S3P,3",
    "T4,25:00:00,25:00:30,S1P,1",
    "T4,25:04:00,25:04:30,S2P,2",
    "T4,25:08:00,25:08:00,S3P,3",
    "T5,09:00:00,09:00:30,S1P,1",
    "T5,09:04:00,09:04:30,S2P,2",
    "T5,09:08:00,09:08:00,S3P,3",
    "T6,10:00:00,10:00:30,S3P,1",
    "T6,10:04:00,10:04:30,S2P,2",
    "T6,10:08:00,10:08:00,S1P,3",
  ].join("\n"),
  "calendar.txt": [
    "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date",
    "WK,1,1,1,1,1,0,0,20260101,20261231",
    "SAT,0,0,0,0,0,1,0,20260101,20261231",
  ].join("\n"),
};

const GRADES = [
  { from: "Alpha Station, North", to: "Beta", grade: "tunnel" },
  { from: "Beta", to: "Gamma", grade: "elevated" },
];

const build = (options = {}) =>
  processGtfs(FIXTURE, { gradeAnnotations: GRADES, generatedAt: "2026-07-13T00:00:00Z", ...options });

describe("primitives", () => {
  it("parses GTFS times including >24:00", () => {
    expect(parseGtfsTime("08:04:30")).toBe(8 * 3600 + 4 * 60 + 30);
    expect(parseGtfsTime("25:00:00")).toBe(25 * 3600);
    expect(parseGtfsTime("bogus")).toBeNull();
  });

  it("parses quoted CSV fields with commas", () => {
    const rows = parseGtfsCsv(FIXTURE["stops.txt"]);
    expect(rows[0].stop_name).toBe("Alpha Station, North");
  });

  it("drops consecutive duplicate points only", () => {
    expect(
      dedupePoints([
        [1, 1],
        [1, 1],
        [2, 2],
        [1, 1],
      ])
    ).toEqual([
      [1, 1],
      [2, 2],
      [1, 1],
    ]);
  });

  it("projection round-trips within a meter near the origin", () => {
    const { x, z } = projectPoint(47.65, -122.30);
    const lat = PROJECTION.originLat - z / PROJECTION.kmPerDegLat;
    const lng = PROJECTION.originLng + x / PROJECTION.kmPerDegLng;
    expect(Math.abs(lat - 47.65)).toBeLessThan(1e-5);
    expect(Math.abs(lng - -122.30)).toBeLessThan(1e-5);
    // North must render toward -z.
    expect(z).toBeLessThan(0);
  });

  it("computes monotonic cumulative arc length", () => {
    const cum = cumulativeKm([
      [47.6, -122.33],
      [47.62, -122.33],
      [47.65, -122.33],
    ]);
    expect(cum[0]).toBe(0);
    expect(cum[1]).toBeGreaterThan(0);
    expect(cum[2]).toBeGreaterThan(cum[1]);
    // ~0.05° of latitude ≈ 5.6 km
    expect(cum[2]).toBeGreaterThan(5);
    expect(cum[2]).toBeLessThan(6.2);
  });

  it("Douglas-Peucker keeps endpoints and drops collinear points", () => {
    const xz = [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 3],
    ];
    const idx = douglasPeuckerIndices(xz, 0.01);
    expect(idx[0]).toBe(0);
    expect(idx[idx.length - 1]).toBe(3);
    expect(idx).not.toContain(1); // collinear with 0->2
    expect(idx).toContain(2); // the bend survives
  });

  it("snaps points to polyline arc length", () => {
    const xz = [
      [0, 0],
      [0, 10],
    ];
    const cum = [0, 10];
    const snap = snapToPolylineKm(xz, cum, 0.5, 4);
    expect(snap.sKm).toBeCloseTo(4, 5);
    expect(snap.distKm).toBeCloseTo(0.5, 5);
  });

  it("normalizes station names for the annotation join", () => {
    expect(normalizeStationName("Int'l Dist/Chinatown Station")).toBe("intl dist chinatown");
    expect(normalizeStationName("Alpha Station, North")).toBe("alpha north");
  });

  it("derives merged headway bands clamped to real departures", () => {
    // 3 departures in hour 8 (20 min apart) and 3 in hour 9.
    const bands = deriveHeadwayBands([480, 500, 520, 540, 560, 580]);
    expect(bands).toHaveLength(1);
    expect(bands[0].headwayMin).toBe(20);
    expect(bands[0].startMin).toBe(480);
    expect(bands[0].endMin).toBe(581);
  });
});

describe("processGtfs", () => {
  it("keeps only non-T light rail by default", () => {
    const { network } = build();
    expect(network.lines.map((l) => l.id)).toEqual(["1LINE"]);
  });

  it("keeps the T Line behind the flag", () => {
    // The fixture's T Line has no trips, so it warns and is skipped — but it
    // must survive the route filter.
    const { warnings } = build({ includeTLine: true });
    expect(warnings.some((w) => w.includes("TLINE"))).toBe(true);
  });

  it("rolls platforms up to parent stations and snaps them in order", () => {
    const { network } = build();
    const dir0 = network.lines[0].directions.find((d) => d.directionId === 0);
    expect(dir0.stations.map((s) => s.id)).toEqual(["S1", "S2", "S3"]);
    const schedule = build().schedule;
    const sDir0 = schedule.lines[0].directions.find((d) => d.directionId === 0);
    const s = sDir0.stations.map((st) => st.sKm);
    expect(s[0]).toBeCloseTo(0, 2);
    expect(s[1]).toBeGreaterThan(s[0]);
    expect(s[2]).toBeGreaterThan(s[1]);
  });

  it("produces monotonic cumKm and deduped geometry", () => {
    const { network } = build();
    for (const line of network.lines) {
      for (const dir of line.directions) {
        expect(dir.points.length).toBe(dir.cumKm.length);
        for (let i = 1; i < dir.cumKm.length; i++) {
          expect(dir.cumKm[i]).toBeGreaterThan(dir.cumKm[i - 1]);
        }
      }
    }
  });

  it("derives run times and floors dwell", () => {
    const { schedule } = build();
    const dir0 = schedule.lines[0].directions.find((d) => d.directionId === 0);
    // 08:00:30 -> 08:04:00 = 210s
    expect(dir0.stations[0].runSecToNext).toBe(210);
    expect(dir0.stations[2].runSecToNext).toBeNull();
    // GTFS dwell of 30s < 25s floor stays 30; the floor only lifts 0s dwells.
    expect(dir0.stations[0].dwellSec).toBe(30);
  });

  it("splits service into weekday and saturday buckets with >24h trips intact", () => {
    const { schedule } = build();
    const wk = schedule.service.find(
      (s) => s.dayBucket === "weekday" && s.directionId === 0
    );
    const sat = schedule.service.find(
      (s) => s.dayBucket === "saturday" && s.directionId === 0
    );
    expect(wk).toBeDefined();
    expect(sat).toBeDefined();
    // Weekday departures: 08:00:30..08:40:30 plus the 25:00:30 owl trip.
    const lastBand = wk.bands[wk.bands.length - 1];
    expect(lastBand.endMin).toBeGreaterThan(1440);
  });

  it("joins grade annotations by name pair and defaults with a warning", () => {
    const { network, warnings } = build();
    const dir0 = network.lines[0].directions.find((d) => d.directionId === 0);
    expect(dir0.grades.map((g) => g.grade)).toEqual(["tunnel", "elevated"]);
    // Grades span the whole shape.
    expect(dir0.grades[0].fromKm).toBe(0);
    expect(dir0.grades[dir0.grades.length - 1].toKm).toBeCloseTo(
      dir0.cumKm[dir0.cumKm.length - 1],
      3
    );

    const { network: bare, warnings: bareWarnings } = build({ gradeAnnotations: [] });
    const bareDir0 = bare.lines[0].directions.find((d) => d.directionId === 0);
    expect(bareDir0.grades.map((g) => g.grade)).toEqual(["at-grade"]);
    expect(bareWarnings.some((w) => w.includes("no grade annotation"))).toBe(true);
    expect(warnings.every((w) => !w.includes("no grade annotation"))).toBe(true);
  });

  it("registers stations once with projected coordinates and line refs", () => {
    const { network } = build();
    expect(network.stations).toHaveLength(3);
    const alpha = network.stations.find((s) => s.id === "S1");
    expect(alpha.name).toBe("Alpha Station, North");
    expect(alpha.lines).toEqual(["1LINE"]);
    expect(alpha.z).toBeLessThan(0); // north of origin renders at -z
  });

  it("does not double-count departures across overlapping service_ids", () => {
    // Duplicate the weekday service under a second service_id: same trips,
    // same times. The derived headway must not halve.
    const fixture = {
      ...FIXTURE,
      "calendar.txt":
        FIXTURE["calendar.txt"] + "\nWK2,1,1,1,1,1,0,0,20260101,20261231",
      "trips.txt":
        FIXTURE["trips.txt"] +
        "\n1LINE,WK2,T1B,0,SH0,Gamma\n1LINE,WK2,T2B,0,SH0,Gamma\n1LINE,WK2,T3B,0,SH0,Gamma",
      "stop_times.txt":
        FIXTURE["stop_times.txt"] +
        [
          "",
          "T1B,08:00:00,08:00:30,S1P,1",
          "T1B,08:04:00,08:04:30,S2P,2",
          "T1B,08:08:00,08:08:00,S3P,3",
          "T2B,08:20:00,08:20:30,S1P,1",
          "T2B,08:24:00,08:24:30,S2P,2",
          "T2B,08:28:00,08:28:00,S3P,3",
          "T3B,08:40:00,08:40:30,S1P,1",
          "T3B,08:44:00,08:44:30,S2P,2",
          "T3B,08:48:00,08:48:00,S3P,3",
        ].join("\n"),
    };
    const { schedule } = processGtfs(fixture, { gradeAnnotations: GRADES });
    const wk = schedule.service.find(
      (s) => s.dayBucket === "weekday" && s.directionId === 0
    );
    const morning = wk.bands.find((b) => b.startMin <= 480 && b.endMin > 480);
    expect(morning.headwayMin).toBe(20); // 3 trips in the hour, not 6
  });

  it("emits the shared projection in meta", () => {
    const { network } = build();
    expect(network.meta.projection).toEqual(PROJECTION);
  });
});
