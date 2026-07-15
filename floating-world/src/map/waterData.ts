// Hand-authored, deliberately simplified water bodies — artistic license,
// not cartography. Barely-visible dark masses whose silhouettes let a local
// orient instantly: Lake Washington (with Mercer Island), Lake Union,
// Elliott Bay, the Duwamish, Lake Sammamish. [lat, lng] rings, unprojected.

export interface WaterBody {
  name: string;
  ring: [number, number][];
  holes?: [number, number][][];
}

export const WATER: WaterBody[] = [
  {
    name: "Lake Washington",
    ring: [
      [47.765, -122.27],
      [47.72, -122.282],
      [47.688, -122.256],
      [47.655, -122.276],
      [47.615, -122.286],
      [47.585, -122.288],
      [47.552, -122.268],
      [47.523, -122.262],
      [47.5, -122.22],
      [47.53, -122.19],
      [47.575, -122.196],
      [47.62, -122.202],
      [47.665, -122.208],
      [47.71, -122.198],
      [47.755, -122.216],
    ],
    holes: [
      [
        [47.595, -122.238],
        [47.572, -122.208],
        [47.532, -122.242],
        [47.572, -122.258],
      ],
    ],
  },
  {
    name: "Lake Union",
    ring: [
      [47.648, -122.342],
      [47.649, -122.318],
      [47.646, -122.305],
      [47.638, -122.312],
      [47.624, -122.322],
      [47.621, -122.333],
      [47.632, -122.345],
    ],
  },
  {
    name: "Elliott Bay",
    ring: [
      [47.628, -122.365],
      [47.64, -122.415],
      [47.60, -122.44],
      [47.568, -122.412],
      [47.578, -122.368],
      [47.59, -122.35],
      [47.603, -122.342],
      [47.617, -122.352],
    ],
  },
  {
    name: "Duwamish Waterway",
    ring: [
      [47.586, -122.36],
      [47.566, -122.352],
      [47.548, -122.338],
      [47.528, -122.318],
      [47.506, -122.306],
      [47.49, -122.298],
      [47.488, -122.286],
      [47.505, -122.292],
      [47.527, -122.304],
      [47.549, -122.324],
      [47.568, -122.34],
      [47.585, -122.35],
    ],
  },
  {
    name: "Lake Sammamish",
    ring: [
      [47.655, -122.1],
      [47.63, -122.086],
      [47.598, -122.072],
      [47.565, -122.08],
      [47.558, -122.102],
      [47.592, -122.112],
      [47.628, -122.108],
    ],
  },
];

// Tacoma's water, ~45 km south of the origin: Commencement Bay biting in from
// the Sound to the NE of downtown, and the narrow Thea Foss Waterway running
// south into the city past the Museum of Glass. The baked OSM basemap stops at
// its southern bbox edge (47.35), well north of Tacoma, so this stretch of
// coast never renders from the basemap — these hand-authored rings are the ONLY
// water down here, and map/Water.tsx always appends them (they read the same
// woodblock pigment + seigaiha + tideline as every other shore). Deliberately
// simplified, like the rest of waterData.ts — orientation over cartography, so
// the T Line's downtown reads as the real waterfront city it is.
//
// "South Sound Approach" below is the fix for a real bug this left behind: the
// baked basemap water gets hard-clipped flat right at lat 47.35 (near
// Redondo/Federal Way), a full ~6 km short of Commencement Bay's northern
// edge. With nothing hand-authored in between, that gap rendered as solid
// land — the Sound looked like it stopped short and Commencement Bay read as
// an isolated inland lake instead of the same body of water. This ring
// follows the real coast (Redondo → Poverty Bay → Dash Point → Browns Point)
// from the exact basemap edge down to the bay mouth, so the water reads
// unbroken the whole way to Tacoma, the way it actually is.
export const TACOMA_WATER: WaterBody[] = [
  {
    name: "South Sound Approach",
    ring: [
      [47.35, -122.324], // the basemap's hard bbox edge — must match exactly, no seam
      [47.352, -122.322], // Redondo
      [47.332, -122.353], // Poverty Bay, off the Federal Way bluff
      [47.317, -122.404], // Dash Point
      [47.305, -122.435], // Browns Point, the mouth of Commencement Bay
      [47.298, -122.423], // into the bay's open water — matches Commencement Bay's NE point
      [47.305, -122.36], // offshore, back north past Dash Point
      [47.325, -122.32], // offshore past Poverty Bay
      [47.35, -122.28], // offshore back up to the basemap edge's latitude
    ],
  },
  {
    name: "Commencement Bay",
    ring: [
      [47.268, -122.452], // SW shore, toward Ruston / Old Town
      [47.285, -122.442],
      [47.298, -122.423], // open water to the north
      [47.291, -122.4],
      [47.276, -122.39], // NE tideflats
      [47.262, -122.401], // east port mouth
      [47.26, -122.42], // south, at the mouth of the Foss
      [47.263, -122.438], // downtown waterfront back to the SW
    ],
  },
  {
    name: "Thea Foss Waterway",
    ring: [
      [47.261, -122.425], // mouth, opening to the bay
      [47.256, -122.427],
      [47.251, -122.4285],
      [47.246, -122.43],
      [47.242, -122.4318], // head of the waterway, by the Museum of Glass
      [47.2415, -122.43], // east bank back north
      [47.2455, -122.4285],
      [47.2505, -122.427],
      [47.2555, -122.4255],
      [47.2605, -122.4235],
    ],
  },
];
