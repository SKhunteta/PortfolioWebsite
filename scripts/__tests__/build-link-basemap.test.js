// Basemap bake pipeline — synthetic Overpass fixtures, no network.
import { describe, it, expect } from "vitest";
import {
  BBOX,
  stitchWays,
  ringAreaKm2,
  pointInRing,
  assembleMultipolygon,
  clipChainToBbox,
  closeCoastline,
  simplifyRing,
  simplifyLine,
  lineLengthKm,
  classifyRoad,
  buildBasemap,
  placeholderBasemap,
} from "../build-link-basemap.mjs";

// A ~2.2 km × 1.5 km rectangle near downtown Seattle (inside BBOX).
const RECT = [
  [47.6, -122.33],
  [47.6, -122.3],
  [47.62, -122.3],
  [47.62, -122.33],
  [47.6, -122.33],
];

describe("stitchWays", () => {
  it("joins fragments in mixed orientations into one ring", () => {
    const frags = [
      [RECT[0], RECT[1]],
      [RECT[2], RECT[1]].map((p) => [...p]), // reversed fragment
      [RECT[2], RECT[3], RECT[4]],
    ];
    const { rings, chains } = stitchWays(frags);
    expect(chains).toHaveLength(0);
    expect(rings).toHaveLength(1);
    expect(rings[0]).toHaveLength(5);
  });

  it("leaves non-connecting fragments as open chains", () => {
    const { rings, chains } = stitchWays([
      [
        [47.6, -122.33],
        [47.6, -122.32],
      ],
      [
        [47.7, -122.33],
        [47.7, -122.32],
      ],
    ]);
    expect(rings).toHaveLength(0);
    expect(chains).toHaveLength(2);
  });
});

describe("polygon math", () => {
  it("shoelace area is plausible for the rect (~5 km²)", () => {
    const area = Math.abs(ringAreaKm2(RECT));
    expect(area).toBeGreaterThan(4.5);
    expect(area).toBeLessThan(5.6);
  });

  it("point-in-ring", () => {
    expect(pointInRing(47.61, -122.31, RECT)).toBe(true);
    expect(pointInRing(47.63, -122.31, RECT)).toBe(false);
  });
});

describe("assembleMultipolygon", () => {
  it("builds outer + contained hole from fragmented members", () => {
    const hole = [
      [47.605, -122.32],
      [47.605, -122.31],
      [47.615, -122.31],
      [47.615, -122.32],
      [47.605, -122.32],
    ];
    const relation = {
      type: "relation",
      members: [
        { type: "way", role: "outer", geometry: RECT.slice(0, 3).map(([lat, lon]) => ({ lat, lon })) },
        {
          type: "way",
          role: "outer",
          geometry: [RECT[2], RECT[3], RECT[4]].map(([lat, lon]) => ({ lat, lon })),
        },
        { type: "way", role: "inner", geometry: hole.map(([lat, lon]) => ({ lat, lon })) },
      ],
    };
    const polys = assembleMultipolygon(relation);
    expect(polys).toHaveLength(1);
    expect(polys[0].holes).toHaveLength(1);
  });
});

describe("clipChainToBbox", () => {
  const bbox = { latMin: 0, latMax: 10, lngMin: 0, lngMax: 10 };

  it("clips a chain that crosses the boundary, cutting at the edge", () => {
    const chains = clipChainToBbox(
      [
        [5, -2],
        [5, 5],
        [15, 5],
      ],
      bbox
    );
    expect(chains).toHaveLength(1);
    const c = chains[0];
    expect(c[0]).toEqual([5, 0]); // entered through the west edge
    expect(c[c.length - 1]).toEqual([10, 5]); // left through the north edge
  });

  it("keeps a fully-interior chain intact", () => {
    const chains = clipChainToBbox(
      [
        [1, 1],
        [2, 2],
      ],
      bbox
    );
    expect(chains).toHaveLength(1);
    expect(chains[0]).toHaveLength(2);
  });
});

describe("closeCoastline", () => {
  const bbox = { latMin: 0, latMax: 10, lngMin: 0, lngMax: 10 };
  // North->south coastline down lng=5; OSM keeps water on the RIGHT of travel,
  // so water is the WEST half.
  const chain = [
    [10, 5],
    [5, 5],
    [0, 5],
  ];

  it("closes clockwise around the water side, inserting corners", () => {
    const polys = closeCoastline([chain], [], bbox);
    expect(polys).toHaveLength(1);
    const ring = polys[0].ring;
    // Water side (west) is inside; land side (east) is not.
    expect(pointInRing(5, 2.5, ring)).toBe(true);
    expect(pointInRing(5, 7.5, ring)).toBe(false);
    // The SW and NW corners were inserted by the perimeter walk.
    expect(ring.some(([lat, lng]) => lat === 0 && lng === 0)).toBe(true);
    expect(ring.some(([lat, lng]) => lat === 10 && lng === 0)).toBe(true);
  });

  it("attaches island rings as holes of the containing polygon", () => {
    const island = [
      [4, 2],
      [4, 3],
      [6, 3],
      [6, 2],
      [4, 2],
    ];
    const polys = closeCoastline([chain], [island], bbox);
    expect(polys[0].holes).toHaveLength(1);
    // An island on the land side is dropped.
    const landIsland = [
      [4, 7],
      [4, 8],
      [6, 8],
      [6, 7],
      [4, 7],
    ];
    const polys2 = closeCoastline([chain], [landIsland], bbox);
    expect(polys2[0].holes).toHaveLength(0);
  });
});

describe("simplification + filters", () => {
  it("drops collinear ring points but keeps corners", () => {
    const ring = [
      [47.6, -122.33],
      [47.6, -122.315], // collinear midpoint
      [47.6, -122.3],
      [47.62, -122.3],
      [47.62, -122.33],
      [47.6, -122.33],
    ];
    const xz = simplifyRing(ring, 0.02);
    expect(xz).toHaveLength(4);
  });

  it("returns null for degenerate rings", () => {
    expect(simplifyRing([[47.6, -122.3], [47.6, -122.3], [47.6, -122.3]], 0.02)).toBeNull();
  });

  it("measures projected line length", () => {
    const line = simplifyLine(
      [
        [47.6, -122.33],
        [47.6, -122.3],
      ],
      0.03
    );
    expect(lineLengthKm(line)).toBeGreaterThan(2);
    expect(lineLengthKm(line)).toBeLessThan(2.5);
  });

  it("classifies road tags", () => {
    expect(classifyRoad({ highway: "motorway" })).toBe("major");
    expect(classifyRoad({ highway: "trunk" })).toBe("major");
    expect(classifyRoad({ highway: "primary" })).toBe("arterial");
    expect(classifyRoad({ highway: "secondary" })).toBe("arterial");
    expect(classifyRoad({ highway: "tertiary" })).toBeNull();
    expect(classifyRoad({})).toBeNull();
  });
});

describe("buildBasemap end-to-end", () => {
  const wayEl = (pts, tags = {}) => ({
    type: "way",
    tags,
    geometry: pts.map(([lat, lon]) => ({ lat, lon })),
  });

  const raw = {
    water: { elements: [wayEl(RECT, { natural: "water" })] },
    coastline: {
      elements: [
        // Coastline down lng -122.5 (west of town): water west of it.
        wayEl(
          [
            [47.85, -122.5],
            [47.6, -122.5],
            [47.35, -122.5],
          ],
          { natural: "coastline" }
        ),
      ],
    },
    parks: {
      elements: [
        wayEl(
          [
            [47.63, -122.32],
            [47.63, -122.3],
            [47.65, -122.3],
            [47.65, -122.32],
            [47.63, -122.32],
          ],
          { leisure: "park" }
        ),
        // Tiny pocket park below the area filter.
        wayEl(
          [
            [47.63, -122.4],
            [47.63, -122.3995],
            [47.6304, -122.3995],
            [47.63, -122.4],
          ],
          { leisure: "park" }
        ),
      ],
    },
    roads: {
      elements: [
        wayEl(
          [
            [47.5, -122.32],
            [47.7, -122.32],
          ],
          { highway: "motorway" }
        ),
        wayEl(
          [
            [47.6, -122.31],
            [47.6, -122.29],
          ],
          { highway: "secondary" }
        ),
        // Sub-minimum stub and an excluded class.
        wayEl(
          [
            [47.6, -122.31],
            [47.601, -122.31],
          ],
          { highway: "primary" }
        ),
        wayEl(
          [
            [47.5, -122.3],
            [47.7, -122.3],
          ],
          { highway: "tertiary" }
        ),
      ],
    },
  };

  it("produces all layers with filters applied", () => {
    const { basemap, stats, warnings } = buildBasemap(raw, {
      generatedAt: "2026-07-13T00:00:00Z",
      source: "fixture",
    });
    // Lake + closed sound polygon.
    expect(basemap.water.length).toBe(2);
    expect(stats.soundPolygons).toBe(1);
    expect(basemap.parks).toHaveLength(1); // pocket park filtered
    expect(basemap.roads.major).toHaveLength(1);
    expect(basemap.roads.arterial).toHaveLength(1); // stub + tertiary dropped
    expect(basemap.meta.placeholder).toBe(false);
    expect(basemap.meta.projection.originLat).toBeCloseTo(47.6062, 4);
    expect(basemap.meta.attribution).toContain("OpenStreetMap");
    expect(warnings).toHaveLength(0);
    // Projected coords are compact (3 decimals).
    const [x, z] = basemap.roads.major[0][0];
    expect(x).toBe(Number(x.toFixed(3)));
    expect(z).toBe(Number(z.toFixed(3)));
  });

  it("degrades to lakes-only when coastline is missing", () => {
    const { basemap, warnings } = buildBasemap({ ...raw, coastline: { elements: [] } });
    expect(basemap.water.length).toBe(1);
    expect(warnings.some((w) => w.includes("lakes only"))).toBe(true);
  });

  it("emits a well-formed placeholder", () => {
    const stub = placeholderBasemap();
    expect(stub.meta.placeholder).toBe(true);
    expect(stub.water).toEqual([]);
    expect(stub.roads.major).toEqual([]);
  });

  it("clips coastline chains against the real bbox", () => {
    // A chain wandering outside the bbox gets cut at the west edge.
    const chains = clipChainToBbox([
      [47.7, -122.7],
      [47.7, -122.3],
    ]);
    expect(chains).toHaveLength(1);
    expect(chains[0][0][1]).toBeCloseTo(BBOX.lngMin, 6);
  });
});
