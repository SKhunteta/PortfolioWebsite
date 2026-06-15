// Seattle Link Light Rail Tracker — Station & Line Data
//
// Two eras are modeled:
//   - "current": service as actually running (verified June 2026)
//   - "future":  Sound Transit's Future Service Map (full ST3 buildout)
//
// Future line designations per Sound Transit: 1 Line Lynnwood City Center–
// Tacoma Dome, 2 Line Mariner–Downtown Redmond, 3 Line Everett–West Seattle,
// 4 Line South Kirkland–Central Issaquah, T Line TCC–Tacoma Dome.
// Note: the Ballard Link Extension (the planned new downtown tunnel and the
// Ballard–Midtown stations) has been dropped from the ST3 plan, so the future
// 1 Line keeps running on its existing alignment through the downtown tunnel.
// Line colors are Sound Transit's official brand colors.

export const ERAS = {
  CURRENT: "current",
  FUTURE: "future",
};

export const LINES = {
  "1-line": {
    name: "1 Line",
    shortName: "1",
    color: "#3DAE2B",
    descriptions: {
      current: "Federal Way Downtown – Lynnwood City Center",
      future: "Lynnwood City Center – Tacoma Dome",
    },
  },
  "2-line": {
    name: "2 Line",
    shortName: "2",
    color: "#00A0DF",
    descriptions: {
      current: "Downtown Redmond – Lynnwood City Center",
      future: "Downtown Redmond – Mariner",
    },
  },
  "3-line": {
    name: "3 Line",
    shortName: "3",
    color: "#ED40A9",
    descriptions: {
      current: null,
      future: "Everett – West Seattle",
    },
  },
  "4-line": {
    name: "4 Line",
    shortName: "4",
    color: "#B14FC5",
    descriptions: {
      current: null,
      future: "South Kirkland – Central Issaquah",
    },
  },
  "t-line": {
    name: "T Line",
    shortName: "T",
    color: "#F38B00",
    descriptions: {
      current: "Tacoma Dome – St Joseph",
      future: "Tacoma Community College – Tacoma Dome",
    },
  },
};

export const LINE_ORDER = ["1-line", "2-line", "3-line", "4-line", "t-line"];

export const MAP_CONFIG = {
  center: [47.6062, -122.3321],
  zoom: 11,
  minZoom: 9,
  maxZoom: 16,
  tileUrl: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  tileAttribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
};

// Station fields:
//   currentLines  — lines serving the station today (empty if not yet open)
//   futureLines   — lines per Sound Transit's Future Service Map
//   status        — "open" | "construction" | "planned"
//   opened        — ISO date the station opened (open stations only)
//   plannedOpening — target opening (construction/planned stations only)
// Coordinates for open stations are verified against published station
// locations; planned-station coordinates are approximate (alignments are
// not final).
export const STATIONS = [
  // ===== Shared north corridor: Lynnwood – International District =====
  // Today served by both the 1 and 2 Lines. In the future map the 3 Line joins
  // this trunk too; the 1 Line stays here now that the Ballard Link second
  // downtown tunnel has been dropped from the ST3 plan.
  {
    id: "lynnwood-city-center",
    name: "Lynnwood City Center",
    currentLines: ["1-line", "2-line"],
    futureLines: ["1-line", "2-line", "3-line"],
    lat: 47.81564,
    lng: -122.29473,
    neighborhood: "Lynnwood",
    blurb: "A major shared station on the 1 and 2 Lines in Snohomish County. Lynnwood City Center is a growing urban hub with a large transit-oriented development transforming the area around the station.",
    status: "open",
    opened: "2024-08-30",
    notableFact: "The Lynnwood Link Extension added four new stations and brought light rail to Snohomish County for the first time.",
  },
  {
    id: "mountlake-terrace",
    name: "Mountlake Terrace",
    currentLines: ["1-line", "2-line"],
    futureLines: ["1-line", "2-line", "3-line"],
    lat: 47.7857,
    lng: -122.3152,
    neighborhood: "Mountlake Terrace",
    blurb: "Serving the suburban community of Mountlake Terrace with a large park-and-ride facility. The station connects commuters to downtown Seattle in about 30 minutes.",
    status: "open",
    opened: "2024-08-30",
    notableFact: null,
  },
  {
    id: "shoreline-north-185th",
    name: "Shoreline North/185th",
    currentLines: ["1-line", "2-line"],
    futureLines: ["1-line", "2-line", "3-line"],
    lat: 47.764477,
    lng: -122.322731,
    neighborhood: "Shoreline",
    blurb: "Located at NE 185th Street alongside I-5 in Shoreline, this station serves the northern part of the city and has spurred significant transit-oriented development plans.",
    status: "open",
    opened: "2024-08-30",
    notableFact: null,
  },
  {
    id: "shoreline-south-148th",
    name: "Shoreline South/148th",
    currentLines: ["1-line", "2-line"],
    futureLines: ["1-line", "2-line", "3-line"],
    lat: 47.736126,
    lng: -122.325243,
    neighborhood: "Shoreline",
    blurb: "Serving southern Shoreline near NE 148th Street alongside I-5. The surrounding area is undergoing redevelopment with new housing and mixed-use projects.",
    status: "open",
    opened: "2024-08-30",
    notableFact: null,
  },
  {
    id: "pinehurst",
    name: "Pinehurst",
    currentLines: ["1-line", "2-line"],
    futureLines: ["1-line", "2-line", "3-line"],
    lat: 47.7224,
    lng: -122.3285, // NE 130th St & I-5
    neighborhood: "Pinehurst",
    blurb: "An infill station at NE 130th Street serving the Pinehurst neighborhood between Shoreline and Northgate, currently under construction on the existing line.",
    status: "construction",
    plannedOpening: "Q3 2026",
    notableFact: "Pinehurst is the first infill station to be added to an operating Link line.",
  },
  {
    id: "northgate",
    name: "Northgate",
    currentLines: ["1-line", "2-line"],
    futureLines: ["1-line", "2-line", "3-line"],
    lat: 47.703038,
    lng: -122.328282,
    neighborhood: "Northgate",
    blurb: "A major transit hub adjacent to Northgate Mall and the NHL Kraken community ice rink. The pedestrian bridge connects to North Seattle College.",
    status: "open",
    opened: "2021-10-02",
    notableFact: "The John Lewis Memorial Bridge at Northgate spans I-5 to connect the station with North Seattle College.",
  },
  {
    id: "roosevelt",
    name: "Roosevelt",
    currentLines: ["1-line", "2-line"],
    futureLines: ["1-line", "2-line", "3-line"],
    lat: 47.676107,
    lng: -122.316041,
    neighborhood: "Roosevelt",
    blurb: "A charming residential neighborhood with local restaurants and shops along Roosevelt Way. Named after President Theodore Roosevelt.",
    status: "open",
    opened: "2021-10-02",
    notableFact: null,
  },
  {
    id: "u-district",
    name: "U District",
    currentLines: ["1-line", "2-line"],
    futureLines: ["1-line", "2-line", "3-line"],
    lat: 47.660312,
    lng: -122.314131,
    neighborhood: "University District",
    blurb: "The vibrant heart of Seattle's University District, steps from the Ave (University Way) with its eclectic mix of bookstores, restaurants, and student hangouts.",
    status: "open",
    opened: "2021-10-02",
    notableFact: "The U District station is over 90 feet deep, making it one of the deepest stations in the system.",
  },
  {
    id: "university-of-washington",
    name: "University of Washington",
    currentLines: ["1-line", "2-line"],
    futureLines: ["1-line", "2-line", "3-line"],
    lat: 47.6498,
    lng: -122.3039,
    neighborhood: "University of Washington",
    blurb: "Located at the southeast edge of the UW campus near Husky Stadium. Provides direct access to one of the top research universities in the world.",
    status: "open",
    opened: "2016-03-19",
    notableFact: "This station opened as part of the University Link Extension in 2016, cutting the UW-to-downtown ride to under 10 minutes.",
  },
  {
    id: "capitol-hill",
    name: "Capitol Hill",
    currentLines: ["1-line", "2-line"],
    futureLines: ["1-line", "2-line", "3-line"],
    lat: 47.619591,
    lng: -122.320214,
    neighborhood: "Capitol Hill",
    blurb: "Seattle's most vibrant and eclectic neighborhood, known for its nightlife, diverse dining scene, and the iconic Pike/Pine corridor. A cultural hub of the city.",
    status: "open",
    opened: "2016-03-19",
    notableFact: "Capitol Hill station features 'Jet Kiss' by artist Mike Ross, two repurposed Navy jets suspended over the platform.",
  },
  {
    id: "westlake",
    name: "Westlake",
    currentLines: ["1-line", "2-line"],
    futureLines: ["1-line", "2-line", "3-line"],
    lat: 47.6113,
    lng: -122.3373,
    neighborhood: "Downtown Seattle",
    blurb: "The bustling heart of downtown Seattle. Westlake is the system's busiest station, connecting to the Monorail, bus routes, and the retail core around Westlake Center and Pike Place Market.",
    status: "open",
    opened: "2009-07-18",
    notableFact: "Westlake is the busiest Link station and serves as the downtown hub where the future 1, 2, and 3 Lines all converge.",
  },
  {
    id: "symphony",
    name: "Symphony",
    currentLines: ["1-line", "2-line"],
    futureLines: ["1-line", "2-line", "3-line"],
    lat: 47.6076,
    lng: -122.3358,
    neighborhood: "Downtown Seattle",
    blurb: "Renamed from University Street to Symphony in 2024, this station serves Benaroya Hall, the Seattle Art Museum, and the downtown financial district.",
    status: "open",
    opened: "2009-07-18",
    notableFact: "Renamed to Symphony to better reflect its proximity to Benaroya Hall, home of the Seattle Symphony.",
  },
  {
    id: "pioneer-square",
    name: "Pioneer Square",
    currentLines: ["1-line", "2-line"],
    futureLines: ["1-line", "2-line", "3-line"],
    lat: 47.6029,
    lng: -122.3318,
    neighborhood: "Pioneer Square",
    blurb: "Seattle's original neighborhood, featuring historic red-brick buildings, art galleries, and the famous Underground Tour. The birthplace of the city.",
    status: "open",
    opened: "2009-07-18",
    notableFact: null,
  },
  {
    id: "international-district",
    name: "International District/Chinatown",
    currentLines: ["1-line", "2-line"],
    futureLines: ["1-line", "2-line", "3-line"],
    lat: 47.5981,
    lng: -122.3283,
    neighborhood: "Chinatown-International District",
    blurb: "A culturally rich neighborhood home to Seattle's Chinese, Japanese, Vietnamese, and Filipino communities. The Wing Luke Museum and Uwajimaya grocery are neighborhood landmarks. Today's 2 Line trains branch east toward Judkins Park just south of here.",
    status: "open",
    opened: "2009-07-18",
    notableFact: "This station is a major downtown transfer hub where the future 1, 2, and 3 Lines converge and the 2 Line branches east across Lake Washington.",
  },

  // ===== 1 Line south: Stadium – Federal Way Downtown =====
  {
    id: "stadium",
    name: "Stadium",
    currentLines: ["1-line"],
    futureLines: ["1-line", "3-line"],
    lat: 47.5912,
    lng: -122.3271,
    neighborhood: "SoDo",
    blurb: "Serving T-Mobile Park (Mariners) and Lumen Field (Seahawks/Sounders). The go-to station for Seattle's major sporting events and concerts.",
    status: "open",
    opened: "2009-07-18",
    notableFact: "On game days, this station sees ridership spikes of up to 10x normal levels.",
  },
  {
    id: "sodo",
    name: "SODO",
    currentLines: ["1-line"],
    futureLines: ["1-line", "3-line"],
    lat: 47.5806,
    lng: -122.3275,
    neighborhood: "SoDo",
    blurb: "An industrial district south of downtown that's gradually evolving. SODO station provides access to the area's warehouses, breweries, and the Starbucks headquarters campus.",
    status: "open",
    opened: "2009-07-18",
    notableFact: "The future West Seattle (3 Line) trains will branch off near SODO.",
  },
  {
    id: "beacon-hill",
    name: "Beacon Hill",
    currentLines: ["1-line"],
    futureLines: ["1-line"],
    lat: 47.579401,
    lng: -122.31134,
    neighborhood: "Beacon Hill",
    blurb: "A diverse hilltop neighborhood with stunning views of downtown and Mount Rainier. Known for its community gardens, local restaurants, and the Jefferson Park golf course.",
    status: "open",
    opened: "2009-07-18",
    notableFact: "Beacon Hill station is about 160 feet underground, making it the deepest station in the entire Link system.",
  },
  {
    id: "mount-baker",
    name: "Mount Baker",
    currentLines: ["1-line"],
    futureLines: ["1-line"],
    lat: 47.5762,
    lng: -122.2976,
    neighborhood: "Mount Baker",
    blurb: "A residential neighborhood with growing commercial activity along Rainier Avenue. The station connects to multiple bus routes serving the Rainier Valley.",
    status: "open",
    opened: "2009-07-18",
    notableFact: null,
  },
  {
    id: "columbia-city",
    name: "Columbia City",
    currentLines: ["1-line"],
    futureLines: ["1-line"],
    lat: 47.5599,
    lng: -122.2926,
    neighborhood: "Columbia City",
    blurb: "One of Seattle's most diverse and beloved neighborhoods. Columbia City features a thriving main street with independent shops, restaurants from around the world, and a historic cinema.",
    status: "open",
    opened: "2009-07-18",
    notableFact: "Columbia City was named one of the best neighborhoods in America by multiple publications for its diversity and walkability.",
  },
  {
    id: "graham-street",
    name: "Graham Street",
    currentLines: [],
    futureLines: ["1-line"],
    lat: 47.547, // approximate — MLK Jr Way S & S Graham St
    lng: -122.286,
    neighborhood: "Hillman City",
    blurb: "A planned infill station between Columbia City and Othello, serving the Hillman City neighborhood. Part of a long-planned effort to improve transit access in the Rainier Valley.",
    status: "planned",
    plannedOpening: "2031",
    notableFact: "Graham Street has been sought by the community since the original Link light rail opened in 2009.",
  },
  {
    id: "othello",
    name: "Othello",
    currentLines: ["1-line"],
    futureLines: ["1-line"],
    lat: 47.5382,
    lng: -122.2812,
    neighborhood: "Othello",
    blurb: "A multicultural neighborhood in the Rainier Valley with a mix of East African, Southeast Asian, and Latin American communities. Home to numerous ethnic grocery stores and restaurants.",
    status: "open",
    opened: "2009-07-18",
    notableFact: null,
  },
  {
    id: "rainier-beach",
    name: "Rainier Beach",
    currentLines: ["1-line"],
    futureLines: ["1-line"],
    lat: 47.523477,
    lng: -122.27951,
    neighborhood: "Rainier Beach",
    blurb: "The southernmost Seattle neighborhood on the Link light rail. Rainier Beach is known for its community resilience, urban farm projects, and proximity to Lake Washington.",
    status: "open",
    opened: "2009-07-18",
    notableFact: null,
  },
  {
    id: "boeing-access-road",
    name: "Boeing Access Road",
    currentLines: [],
    futureLines: ["1-line"],
    lat: 47.503, // approximate — alignment not final
    lng: -122.2734,
    neighborhood: "Georgetown",
    blurb: "A planned infill station between Rainier Beach and Tukwila, near Boeing's facilities along East Marginal Way. Will improve transit access to the Duwamish industrial area.",
    status: "planned",
    plannedOpening: "2031",
    notableFact: null,
  },
  {
    id: "tukwila-intl-blvd",
    name: "Tukwila International Blvd",
    currentLines: ["1-line"],
    futureLines: ["1-line"],
    lat: 47.464098,
    lng: -122.288201,
    neighborhood: "Tukwila",
    blurb: "Serving the diverse Tukwila community along International Boulevard. The area is one of the most ethnically diverse zip codes in the United States.",
    status: "open",
    opened: "2009-07-18",
    notableFact: null,
  },
  {
    id: "seatac-airport",
    name: "SeaTac/Airport",
    currentLines: ["1-line"],
    futureLines: ["1-line"],
    lat: 47.4445,
    lng: -122.2968,
    neighborhood: "SeaTac",
    blurb: "Direct access to Seattle-Tacoma International Airport via a skybridge to the terminal. One of the most-used stations for visitors arriving in the region.",
    status: "open",
    opened: "2009-12-19",
    notableFact: "SeaTac is one of the few US airports with direct light rail service to downtown, with a ride time of about 38 minutes.",
  },
  {
    id: "angle-lake",
    name: "Angle Lake",
    currentLines: ["1-line"],
    futureLines: ["1-line"],
    lat: 47.422638,
    lng: -122.297787,
    neighborhood: "SeaTac",
    blurb: "Named after the nearby Angle Lake, a popular swimming spot. The station includes a large parking garage and serves as a gateway to the southern suburbs.",
    status: "open",
    opened: "2016-09-24",
    notableFact: null,
  },
  {
    id: "kent-des-moines",
    name: "Kent Des Moines",
    currentLines: ["1-line"],
    futureLines: ["1-line"],
    lat: 47.389545,
    lng: -122.294398,
    neighborhood: "Kent/Des Moines",
    blurb: "Serving the communities of Kent and Des Moines along the Highway 99 corridor near Highline College. Part of the Federal Way Link Extension that brought rail further south.",
    status: "open",
    opened: "2025-12-06",
    notableFact: null,
  },
  {
    id: "star-lake",
    name: "Star Lake",
    currentLines: ["1-line"],
    futureLines: ["1-line"],
    lat: 47.359318,
    lng: -122.29742,
    neighborhood: "Star Lake",
    blurb: "A suburban station serving the Star Lake area between Kent and Federal Way. Features a park-and-ride facility for South King County commuters.",
    status: "open",
    opened: "2025-12-06",
    notableFact: null,
  },
  {
    id: "federal-way-downtown",
    name: "Federal Way Downtown",
    currentLines: ["1-line"],
    futureLines: ["1-line"],
    lat: 47.3174,
    lng: -122.3032,
    neighborhood: "Federal Way",
    blurb: "The current southern terminus of the 1 Line. Federal Way Downtown station anchors the city's growing downtown core and connects to bus service throughout South King County.",
    status: "open",
    opened: "2025-12-06",
    notableFact: "The Federal Way Link Extension added 7.8 miles of light rail and three new stations in December 2025.",
  },

  // ===== Future 1 Line south: Tacoma Dome Link Extension (planned) =====
  {
    id: "south-federal-way",
    name: "South Federal Way",
    currentLines: [],
    futureLines: ["1-line"],
    lat: 47.292, // approximate — alignment not final
    lng: -122.314,
    neighborhood: "Federal Way",
    blurb: "Planned station south of Federal Way Downtown, part of the Tacoma Dome Link Extension carrying the future 1 Line toward Tacoma.",
    status: "planned",
    plannedOpening: "2035",
    notableFact: null,
  },
  {
    id: "fife",
    name: "Fife",
    currentLines: [],
    futureLines: ["1-line"],
    lat: 47.2393, // approximate — alignment not final
    lng: -122.3568,
    neighborhood: "Fife",
    blurb: "Planned station in the city of Fife along the Pacific Highway corridor, serving the growing communities between Federal Way and Tacoma.",
    status: "planned",
    plannedOpening: "2035",
    notableFact: null,
  },
  {
    id: "east-tacoma",
    name: "East Tacoma",
    currentLines: [],
    futureLines: ["1-line"],
    lat: 47.24, // approximate — alignment not final
    lng: -122.407,
    neighborhood: "East Tacoma",
    blurb: "Planned station near the Puyallup River and Portland Avenue, serving East Tacoma and the Puyallup Tribe's lands on the approach to the Tacoma Dome.",
    status: "planned",
    plannedOpening: "2035",
    notableFact: null,
  },

  // ===== 2 Line east: Judkins Park – Downtown Redmond =====
  {
    id: "judkins-park",
    name: "Judkins Park",
    currentLines: ["2-line"],
    futureLines: ["2-line"],
    lat: 47.59029,
    lng: -122.30276,
    neighborhood: "Judkins Park",
    blurb: "The first station east of the downtown tunnel, in the median of I-90 between Rainier Avenue S and 23rd Avenue S. Located in the diverse Judkins Park neighborhood of the Central District.",
    status: "open",
    opened: "2026-03-28",
    notableFact: "Judkins Park opened in March 2026 with the Crosslake Connection, finally linking the Eastside 2 Line segment to Seattle.",
  },
  {
    id: "mercer-island",
    name: "Mercer Island",
    currentLines: ["2-line"],
    futureLines: ["2-line"],
    lat: 47.58871,
    lng: -122.23154,
    neighborhood: "Mercer Island",
    blurb: "Located in the median of I-90 between 77th and 80th avenues on the north end of Mercer Island, giving the island community a direct light rail connection to both Seattle and Bellevue.",
    status: "open",
    opened: "2026-03-28",
    notableFact: "The 2 Line crosses Lake Washington on the I-90 floating bridge — the first light rail line on a floating bridge anywhere in the world.",
  },
  {
    id: "south-bellevue",
    name: "South Bellevue",
    currentLines: ["2-line"],
    futureLines: ["2-line"],
    lat: 47.58656,
    lng: -122.19041,
    neighborhood: "South Bellevue",
    blurb: "An elevated station on Bellevue Way SE near Mercer Slough Nature Park, with a 1,500-stall park-and-ride garage serving Eastside commuters.",
    status: "open",
    opened: "2024-04-27",
    notableFact: null,
  },
  {
    id: "east-main",
    name: "East Main",
    currentLines: ["2-line"],
    futureLines: ["2-line", "4-line"],
    lat: 47.605667,
    lng: -122.190788,
    neighborhood: "Bellevue",
    blurb: "Serving the residential areas of south-central Bellevue along 112th Avenue SE, near Surrey Downs Park and Old Bellevue with its boutique shopping district.",
    status: "open",
    opened: "2024-04-27",
    notableFact: null,
  },
  {
    id: "bellevue-downtown",
    name: "Bellevue Downtown",
    currentLines: ["2-line"],
    futureLines: ["2-line", "4-line"],
    lat: 47.6156,
    lng: -122.1943,
    neighborhood: "Downtown Bellevue",
    blurb: "The heart of the Eastside's largest city, at the east portal of the downtown Bellevue tunnel. Downtown Bellevue has transformed into a major urban center with gleaming high-rises, Bellevue Square, and a thriving restaurant scene.",
    status: "open",
    opened: "2024-04-27",
    notableFact: "Bellevue is the 5th largest city in Washington state and a major tech hub hosting Amazon, Meta, and other companies.",
  },
  {
    id: "wilburton",
    name: "Wilburton",
    currentLines: ["2-line"],
    futureLines: ["2-line", "4-line"],
    lat: 47.617909,
    lng: -122.183806,
    neighborhood: "Wilburton",
    blurb: "An evolving neighborhood east of downtown Bellevue, home to the Bellevue Botanical Garden and the new Wilburton Village mixed-use development.",
    status: "open",
    opened: "2024-04-27",
    notableFact: null,
  },
  {
    id: "spring-district",
    name: "Spring District",
    currentLines: ["2-line"],
    futureLines: ["2-line"],
    lat: 47.62335,
    lng: -122.17872,
    neighborhood: "Spring District",
    blurb: "A brand-new neighborhood built around the station. The Spring District is home to a major Meta campus and the Global Innovation Exchange.",
    status: "open",
    opened: "2024-04-27",
    notableFact: "The Spring District is one of the first neighborhoods in the region designed from the ground up around a light rail station.",
  },
  {
    id: "bel-red",
    name: "BelRed",
    currentLines: ["2-line"],
    futureLines: ["2-line"],
    lat: 47.62445,
    lng: -122.165794,
    neighborhood: "Bel-Red",
    blurb: "Formerly an industrial and auto-row corridor, Bel-Red is rapidly transforming into a mixed-use neighborhood with new apartments, shops, and creative spaces.",
    status: "open",
    opened: "2024-04-27",
    notableFact: null,
  },
  {
    id: "overlake-village",
    name: "Overlake Village",
    currentLines: ["2-line"],
    futureLines: ["2-line"],
    lat: 47.636387,
    lng: -122.138799,
    neighborhood: "Overlake",
    blurb: "Adjacent to the Microsoft campus area in Redmond. Overlake Village is a new urban center growing up around the station with housing, retail, and office space.",
    status: "open",
    opened: "2024-04-27",
    notableFact: null,
  },
  {
    id: "redmond-technology",
    name: "Redmond Technology",
    currentLines: ["2-line"],
    futureLines: ["2-line"],
    lat: 47.644812,
    lng: -122.133615,
    neighborhood: "Redmond",
    blurb: "Serving the Redmond technology corridor including Microsoft and Nintendo of America. A major employment hub on the Eastside.",
    status: "open",
    opened: "2024-04-27",
    notableFact: "Microsoft's main campus, adjacent to this station, employs tens of thousands of people.",
  },
  {
    id: "marymoor-village",
    name: "Marymoor Village",
    currentLines: ["2-line"],
    futureLines: ["2-line"],
    lat: 47.667274,
    lng: -122.109758,
    neighborhood: "Redmond",
    blurb: "Located along SR 520 near Marymoor Park, King County's largest park. The station includes a 1,400-stall park-and-ride garage and connects to regional trails.",
    status: "open",
    opened: "2025-05-10",
    notableFact: "New King County trails connect Marymoor Village station directly to Marymoor Park and the regional trail network.",
  },
  {
    id: "downtown-redmond",
    name: "Downtown Redmond",
    currentLines: ["2-line"],
    futureLines: ["2-line"],
    lat: 47.673, // elevated platform along Cleveland St between 164th & 166th
    lng: -122.1205,
    neighborhood: "Downtown Redmond",
    blurb: "The eastern terminus of the 2 Line, elevated along Cleveland Street in Redmond's walkable downtown. Saturday farmers markets and the Sammamish River Trail are steps away.",
    status: "open",
    opened: "2025-05-10",
    notableFact: "Redmond is known as the 'Bicycle Capital of the Northwest' with extensive trail connections from this station.",
  },

  // ===== Future north: Lynnwood – Everett (3 Line, shared with 2 Line to Mariner) =====
  {
    id: "west-alderwood",
    name: "West Alderwood",
    currentLines: [],
    futureLines: ["2-line", "3-line"],
    lat: 47.8285, // approximate — alignment not final
    lng: -122.278,
    neighborhood: "Lynnwood",
    blurb: "Planned station near Alderwood Mall on the Everett Link Extension, the first stop north of Lynnwood City Center.",
    status: "planned",
    plannedOpening: "2037",
    notableFact: null,
  },
  {
    id: "ash-way",
    name: "Ash Way",
    currentLines: [],
    futureLines: ["2-line", "3-line"],
    lat: 47.8532, // near the existing Ash Way Park & Ride
    lng: -122.2588,
    neighborhood: "Ash Way",
    blurb: "Planned station near the existing Ash Way Park & Ride, serving south Snohomish County commuters on the shared 2/3 Line corridor.",
    status: "planned",
    plannedOpening: "2037",
    notableFact: null,
  },
  {
    id: "mariner",
    name: "Mariner",
    currentLines: [],
    futureLines: ["2-line", "3-line"],
    lat: 47.88, // near the existing Mariner Park & Ride
    lng: -122.2386,
    neighborhood: "Mariner",
    blurb: "Planned station near the existing Mariner Park & Ride. Under Sound Transit's future service plan, Mariner is the planned northern terminus of the 2 Line.",
    status: "planned",
    plannedOpening: "2037",
    notableFact: null,
  },
  {
    id: "sr99-airport-road",
    name: "SR 99/Airport Road",
    currentLines: [],
    futureLines: ["3-line"],
    lat: 47.892, // approximate — provisional station, alignment not final
    lng: -122.248,
    neighborhood: "Everett",
    blurb: "A provisional (unfunded) station on the Everett Link Extension at SR 99 and Airport Road, serving the surrounding commercial corridor.",
    status: "planned",
    plannedOpening: "2037 (provisional)",
    notableFact: null,
  },
  {
    id: "sw-everett-industrial-center",
    name: "SW Everett Industrial Center",
    currentLines: [],
    futureLines: ["3-line"],
    lat: 47.9065, // approximate — alignment not final
    lng: -122.265,
    neighborhood: "Everett",
    blurb: "Planned station near Paine Field and Boeing's Everett factory, the largest building in the world by volume. Will serve major aerospace manufacturing employment.",
    status: "planned",
    plannedOpening: "2037",
    notableFact: "The nearby Boeing Everett Factory is where the 747, 767, 777, and 787 Dreamliner were assembled.",
  },
  {
    id: "sr526-evergreen",
    name: "SR 526/Evergreen",
    currentLines: [],
    futureLines: ["3-line"],
    lat: 47.918, // approximate — alignment not final
    lng: -122.241,
    neighborhood: "Everett",
    blurb: "Planned station near SR 526 and Evergreen Way on the Everett Link Extension, serving south Everett neighborhoods.",
    status: "planned",
    plannedOpening: "2037",
    notableFact: null,
  },
  {
    id: "everett-station",
    name: "Everett Station",
    currentLines: [],
    futureLines: ["3-line"],
    lat: 47.97515,
    lng: -122.19756,
    neighborhood: "Everett",
    blurb: "The planned northern terminus of the future 3 Line at the existing Everett Station transit hub, connecting with Sounder commuter rail and Amtrak.",
    status: "planned",
    plannedOpening: "2037",
    notableFact: "When complete, the Everett Link Extension will add 16 miles of light rail north of Lynnwood.",
  },

  // ===== Future 3 Line south: West Seattle Link Extension (planned) =====
  {
    id: "delridge",
    name: "Delridge",
    currentLines: [],
    futureLines: ["3-line"],
    lat: 47.566, // approximate — alignment not final
    lng: -122.3625,
    neighborhood: "Delridge",
    blurb: "Planned station near Delridge Way and Andover Street in West Seattle. A diverse community with views of the Duwamish River valley.",
    status: "planned",
    plannedOpening: "2032",
    notableFact: null,
  },
  {
    id: "avalon",
    name: "Avalon",
    currentLines: [],
    futureLines: ["3-line"],
    lat: 47.5672, // approximate — alignment not final
    lng: -122.3766,
    neighborhood: "West Seattle",
    blurb: "Planned station near 35th Avenue SW and Avalon Way, providing a connection point between the Alaska Junction and Delridge communities.",
    status: "planned",
    plannedOpening: "2032",
    notableFact: null,
  },
  {
    id: "alaska-junction",
    name: "Alaska Junction",
    currentLines: [],
    futureLines: ["3-line"],
    lat: 47.5612, // approximate — alignment not final
    lng: -122.3873,
    neighborhood: "West Seattle",
    blurb: "Planned terminus at the heart of West Seattle's Alaska Junction, the neighborhood's walkable village center with local shops and restaurants.",
    status: "planned",
    plannedOpening: "2032",
    notableFact: "West Seattle was an independent city until it was annexed by Seattle in 1907, and many residents maintain a strong sense of separate identity.",
  },

  // ===== Future 4 Line: South Kirkland – Central Issaquah (planned) =====
  {
    id: "south-kirkland",
    name: "South Kirkland",
    currentLines: [],
    futureLines: ["4-line"],
    lat: 47.6442, // near the existing South Kirkland Park & Ride
    lng: -122.1962,
    neighborhood: "South Kirkland",
    blurb: "Planned northern terminus of the future 4 Line at the existing South Kirkland Park & Ride, near the Cross Kirkland Corridor trail.",
    status: "planned",
    plannedOpening: "2050",
    notableFact: null,
  },
  {
    id: "richards-road",
    name: "Richards Road",
    currentLines: [],
    futureLines: ["4-line"],
    lat: 47.581, // approximate — alignment not final
    lng: -122.168,
    neighborhood: "Factoria",
    blurb: "Planned elevated station on the north side of I-90 near Richards Road, serving the Factoria area of Bellevue.",
    status: "planned",
    plannedOpening: "2050",
    notableFact: null,
  },
  {
    id: "eastgate",
    name: "Eastgate",
    currentLines: [],
    futureLines: ["4-line"],
    lat: 47.5797, // approximate — near the Eastgate Park & Ride
    lng: -122.1495,
    neighborhood: "Eastgate",
    blurb: "Planned station near the Eastgate Park & Ride and Bellevue College, a major transit connection point for the I-90 corridor.",
    status: "planned",
    plannedOpening: "2050",
    notableFact: null,
  },
  {
    id: "lakemont",
    name: "Lakemont",
    currentLines: [],
    futureLines: ["4-line"],
    lat: 47.566, // approximate — provisional station, alignment not final
    lng: -122.111,
    neighborhood: "Lakemont",
    blurb: "A provisional (unfunded) station near the Lakemont Boulevard interchange on I-90, between Eastgate and Issaquah in the Cascade foothills.",
    status: "planned",
    plannedOpening: "2050 (provisional)",
    notableFact: null,
  },
  {
    id: "central-issaquah",
    name: "Central Issaquah",
    currentLines: [],
    futureLines: ["4-line"],
    lat: 47.5435, // approximate — alignment not final
    lng: -122.0563,
    neighborhood: "Issaquah",
    blurb: "Planned eastern terminus of the future 4 Line in Issaquah's regional growth center at the base of the Cascade foothills, gateway to Tiger Mountain trails and the historic downtown.",
    status: "planned",
    plannedOpening: "2050",
    notableFact: "Issaquah hosts the annual Salmon Days festival celebrating the return of salmon to Issaquah Creek.",
  },

  // ===== T Line: Tacoma Dome – St Joseph =====
  {
    id: "tacoma-dome",
    name: "Tacoma Dome",
    currentLines: ["t-line"],
    futureLines: ["1-line", "t-line"],
    lat: 47.23984,
    lng: -122.42808,
    neighborhood: "Tacoma",
    blurb: "The eastern terminus of the T Line at the Tacoma Dome regional transit hub, connecting to Sounder commuter rail, Amtrak, and local buses. The future 1 Line from Seattle is planned to terminate here.",
    status: "open",
    opened: "2003-08-22",
    notableFact: "The Tacoma Dome Link Extension is planned to bring 1 Line trains from Seattle to this station in 2035.",
  },
  {
    id: "south-25th",
    name: "South 25th Street",
    currentLines: ["t-line"],
    futureLines: ["t-line"],
    lat: 47.2391,
    lng: -122.4342,
    neighborhood: "Tacoma",
    blurb: "Serving the residential neighborhoods south of downtown Tacoma near South 25th Street. One of the original T Line stations connecting Tacoma Dome to downtown.",
    status: "open",
    opened: "2003-08-22",
    notableFact: null,
  },
  {
    id: "union-station",
    name: "Union Station",
    currentLines: ["t-line"],
    futureLines: ["t-line"],
    lat: 47.243,
    lng: -122.436,
    neighborhood: "Downtown Tacoma",
    blurb: "Located at Tacoma's beautifully restored Union Station, a Beaux-Arts landmark now housing a federal courthouse with Chihuly glass art installations in its grand hall.",
    status: "open",
    opened: "2003-08-22",
    notableFact: "Union Station features a permanent installation of Dale Chihuly glass art, free and open to the public.",
  },
  {
    id: "convention-center",
    name: "Convention Center",
    currentLines: ["t-line"],
    futureLines: ["t-line"],
    lat: 47.2496,
    lng: -122.4385,
    neighborhood: "Downtown Tacoma",
    blurb: "Serving the Greater Tacoma Convention Center and UW Tacoma campus. Located along Commerce Street above Tollefson Plaza.",
    status: "open",
    opened: "2003-08-22",
    notableFact: null,
  },
  {
    id: "theater-district",
    name: "Theater District",
    currentLines: ["t-line"],
    futureLines: ["t-line"],
    lat: 47.2523,
    lng: -122.4392,
    neighborhood: "Downtown Tacoma",
    blurb: "A central T Line station in downtown Tacoma's Theater District. Near the Tacoma Art Museum, Museum of Glass, and the historic Pantages Theater.",
    status: "open",
    opened: "2011-09-01",
    notableFact: null,
  },
  {
    id: "old-city-hall",
    name: "Old City Hall",
    currentLines: ["t-line"],
    futureLines: ["t-line"],
    lat: 47.2577,
    lng: -122.4404,
    neighborhood: "Downtown Tacoma",
    blurb: "Station near Tacoma's historic Old City Hall, a Romanesque Revival landmark built in 1893. Part of the 2023 Hilltop Tacoma Link Extension.",
    status: "open",
    opened: "2023-09-16",
    notableFact: null,
  },
  {
    id: "s-4th",
    name: "S 4th",
    currentLines: ["t-line"],
    futureLines: ["t-line"],
    lat: 47.2613,
    lng: -122.4428,
    neighborhood: "Downtown Tacoma",
    blurb: "Station along South 4th Street in downtown Tacoma, part of the Hilltop Extension providing access to the Stadium District area.",
    status: "open",
    opened: "2023-09-16",
    notableFact: null,
  },
  {
    id: "stadium-district",
    name: "Stadium District",
    currentLines: ["t-line"],
    futureLines: ["t-line"],
    lat: 47.2639,
    lng: -122.449,
    neighborhood: "Stadium District",
    blurb: "Station in the Stadium District neighborhood, known for its historic Stadium High School featured in the film '10 Things I Hate About You.' The northernmost point on the T Line.",
    status: "open",
    opened: "2023-09-16",
    notableFact: "Stadium High School, near this station, was originally built as a luxury hotel in 1891 before being converted to a school.",
  },
  {
    id: "tacoma-general",
    name: "Tacoma General",
    currentLines: ["t-line"],
    futureLines: ["t-line"],
    lat: 47.26,
    lng: -122.4535,
    neighborhood: "Hilltop",
    blurb: "Station near MultiCare Tacoma General Hospital, part of the Hilltop Extension serving Tacoma's medical district.",
    status: "open",
    opened: "2023-09-16",
    notableFact: null,
  },
  {
    id: "6th-ave",
    name: "6th Avenue",
    currentLines: ["t-line"],
    futureLines: ["t-line"],
    lat: 47.2569,
    lng: -122.4529,
    neighborhood: "Hilltop",
    blurb: "Station along 6th Avenue near the Hilltop neighborhood, a vibrant commercial corridor with independent shops, restaurants, and galleries.",
    status: "open",
    opened: "2023-09-16",
    notableFact: null,
  },
  {
    id: "hilltop",
    name: "Hilltop District",
    currentLines: ["t-line"],
    futureLines: ["t-line"],
    lat: 47.2518,
    lng: -122.4517,
    neighborhood: "Hilltop",
    blurb: "A key T Line station in Tacoma's Hilltop neighborhood. The Hilltop Extension brought rail transit back to this historically underserved community.",
    status: "open",
    opened: "2023-09-16",
    notableFact: "The Hilltop Extension was a key equity project, reconnecting a neighborhood that lost its streetcar service in 1938.",
  },
  {
    id: "st-joseph",
    name: "St Joseph",
    currentLines: ["t-line"],
    futureLines: ["t-line"],
    lat: 47.24507,
    lng: -122.45015,
    neighborhood: "Hilltop",
    blurb: "The current western terminus of the T Line near St. Joseph Medical Center, on MLK Jr Way between South 17th and 19th streets.",
    status: "open",
    opened: "2023-09-16",
    notableFact: "The T Line (originally Tacoma Link) was the first modern light rail line in the Puget Sound region, opening in 2003.",
  },
  {
    id: "tacoma-cc",
    name: "Tacoma Community College",
    currentLines: [],
    futureLines: ["t-line"],
    lat: 47.2415, // approximate — alignment and station list not final
    lng: -122.497,
    neighborhood: "West Tacoma",
    blurb: "The planned western terminus of a future T Line extension along the S 19th Street corridor to Tacoma Community College. Intermediate station locations have not been finalized.",
    status: "planned",
    plannedOpening: "2041",
    notableFact: null,
  },
];

// ===== Polyline paths =====
// CURRENT_PATHS: lines as actually running today. Each line is a list of
// segments; each segment is a list of [lat, lng] points (station coordinates
// plus a few visual waypoints for curves).
const NORTH_TRUNK = [
  [47.81564, -122.29473], // Lynnwood City Center
  [47.7857, -122.3152], // Mountlake Terrace
  [47.764477, -122.322731], // Shoreline North/185th
  [47.736126, -122.325243], // Shoreline South/148th
  [47.7224, -122.3285], // Pinehurst (under construction, on existing line)
  [47.703038, -122.328282], // Northgate
  [47.676107, -122.316041], // Roosevelt
  [47.660312, -122.314131], // U District
  [47.6498, -122.3039], // University of Washington
  [47.635, -122.312], // waypoint — Montlake curve
  [47.619591, -122.320214], // Capitol Hill
  [47.6113, -122.3373], // Westlake
  [47.6076, -122.3358], // Symphony
  [47.6029, -122.3318], // Pioneer Square
  [47.5981, -122.3283], // International District/Chinatown
];

const RAINIER_VALLEY_SOUTH = [
  [47.5981, -122.3283], // International District/Chinatown
  [47.5912, -122.3271], // Stadium
  [47.5806, -122.3275], // SODO
  [47.578, -122.32], // waypoint — Beacon Hill tunnel
  [47.579401, -122.31134], // Beacon Hill
  [47.5762, -122.2976], // Mount Baker
  [47.5599, -122.2926], // Columbia City
  [47.547, -122.286], // Graham Street (planned infill, on existing line)
  [47.5382, -122.2812], // Othello
  [47.523477, -122.27951], // Rainier Beach
  [47.503, -122.2734], // Boeing Access Road (planned infill, on existing line)
  [47.464098, -122.288201], // Tukwila International Blvd
  [47.4445, -122.2968], // SeaTac/Airport
  [47.422638, -122.297787], // Angle Lake
  [47.389545, -122.294398], // Kent Des Moines
  [47.359318, -122.29742], // Star Lake
  [47.34, -122.301], // waypoint
  [47.3174, -122.3032], // Federal Way Downtown
];

const EASTSIDE_BRANCH = [
  [47.5981, -122.3283], // International District/Chinatown
  [47.59029, -122.30276], // Judkins Park
  [47.5897, -122.288], // waypoint — I-90 east portal
  [47.58871, -122.23154], // Mercer Island
  [47.5839, -122.207], // waypoint — east channel bridge
  [47.58656, -122.19041], // South Bellevue
  [47.605667, -122.190788], // East Main
  [47.6156, -122.1943], // Bellevue Downtown
  [47.617909, -122.183806], // Wilburton
  [47.62335, -122.17872], // Spring District
  [47.62445, -122.165794], // BelRed
  [47.636387, -122.138799], // Overlake Village
  [47.644812, -122.133615], // Redmond Technology
  [47.66, -122.121], // waypoint — SR 520 curve
  [47.667274, -122.109758], // Marymoor Village
  [47.673, -122.1205], // Downtown Redmond
];

const T_LINE_PATH = [
  [47.23984, -122.42808], // Tacoma Dome
  [47.2391, -122.4342], // S 25th
  [47.243, -122.436], // Union Station
  [47.2496, -122.4385], // Convention Center
  [47.2523, -122.4392], // Theater District
  [47.2577, -122.4404], // Old City Hall
  [47.2613, -122.4428], // S 4th
  [47.2639, -122.449], // Stadium District
  [47.26, -122.4535], // Tacoma General
  [47.2569, -122.4529], // 6th Ave
  [47.2518, -122.4517], // Hilltop District
  [47.24507, -122.45015], // St Joseph
];

export const CURRENT_PATHS = {
  "1-line": [[...NORTH_TRUNK, ...RAINIER_VALLEY_SOUTH.slice(1)]],
  "2-line": [[...NORTH_TRUNK, ...EASTSIDE_BRANCH.slice(1)]],
  "t-line": [T_LINE_PATH],
};

// FUTURE_PATHS: full ST3 buildout. Each line is a list of segments tagged
// "open" (running today) or "planned" (dashed on the map).
export const FUTURE_PATHS = {
  "1-line": [
    {
      // Ballard Link (the new downtown tunnel) was dropped from the ST3 plan,
      // so the future 1 Line keeps its existing alignment through the downtown
      // tunnel: Lynnwood City Center – Federal Way Downtown.
      status: "open",
      points: [...NORTH_TRUNK, ...RAINIER_VALLEY_SOUTH.slice(1)],
    },
    {
      status: "planned", // Tacoma Dome Link Extension
      points: [
        [47.3174, -122.3032], // Federal Way Downtown
        [47.292, -122.314], // South Federal Way
        [47.2393, -122.3568], // Fife
        [47.24, -122.407], // East Tacoma
        [47.23984, -122.42808], // Tacoma Dome
      ],
    },
  ],
  "2-line": [
    {
      status: "planned", // Everett Link segment shared to Mariner
      points: [
        [47.88, -122.2386], // Mariner
        [47.8532, -122.2588], // Ash Way
        [47.8285, -122.278], // West Alderwood
        [47.81564, -122.29473], // Lynnwood City Center
      ],
    },
    {
      status: "open", // today's full 2 Line
      points: [...NORTH_TRUNK, ...EASTSIDE_BRANCH.slice(1)],
    },
  ],
  "3-line": [
    {
      status: "planned", // Everett Link Extension
      points: [
        [47.97515, -122.19756], // Everett Station
        [47.918, -122.241], // SR 526/Evergreen
        [47.9065, -122.265], // SW Everett Industrial Center
        [47.892, -122.248], // SR 99/Airport Road (provisional)
        [47.88, -122.2386], // Mariner
        [47.8532, -122.2588], // Ash Way
        [47.8285, -122.278], // West Alderwood
        [47.81564, -122.29473], // Lynnwood City Center
      ],
    },
    {
      status: "open", // existing trunk Lynnwood – SODO
      points: [
        ...NORTH_TRUNK,
        [47.5912, -122.3271], // Stadium
        [47.5806, -122.3275], // SODO
      ],
    },
    {
      status: "planned", // West Seattle Link Extension
      points: [
        [47.5806, -122.3275], // SODO
        [47.566, -122.3625], // Delridge
        [47.5672, -122.3766], // Avalon
        [47.5612, -122.3873], // Alaska Junction
      ],
    },
  ],
  "4-line": [
    {
      status: "planned", // South Kirkland – Wilburton
      points: [
        [47.6442, -122.1962], // South Kirkland
        [47.617909, -122.183806], // Wilburton
      ],
    },
    {
      status: "open", // interlined with the 2 Line through downtown Bellevue
      points: [
        [47.617909, -122.183806], // Wilburton
        [47.6156, -122.1943], // Bellevue Downtown
        [47.605667, -122.190788], // East Main
      ],
    },
    {
      status: "planned", // East Main – Central Issaquah along I-90
      points: [
        [47.605667, -122.190788], // East Main
        [47.5879, -122.176], // waypoint — I-90 interchange
        [47.581, -122.168], // Richards Road
        [47.5797, -122.1495], // Eastgate
        [47.566, -122.111], // Lakemont (provisional)
        [47.5435, -122.0563], // Central Issaquah
      ],
    },
  ],
  "t-line": [
    {
      status: "open",
      points: T_LINE_PATH,
    },
    {
      status: "planned", // TCC extension along S 19th St (stations TBD)
      points: [
        [47.24507, -122.45015], // St Joseph
        [47.2435, -122.464], // waypoint — S 19th St
        [47.2425, -122.48], // waypoint — S 19th St
        [47.2415, -122.497], // Tacoma Community College
      ],
    },
  ],
};

// Lines that exist in a given era (drives the filter bar).
export const LINES_FOR_ERA = {
  [ERAS.CURRENT]: ["1-line", "2-line", "t-line"],
  [ERAS.FUTURE]: LINE_ORDER,
};

export const stationLinesForEra = (station, era) =>
  era === ERAS.CURRENT ? station.currentLines : station.futureLines;

// A station appears in the Present view if it is served today or is under
// construction on an operating line; the Future view shows everything.
export const stationVisibleInEra = (station, era) => {
  if (era === ERAS.FUTURE) return station.futureLines.length > 0;
  return station.currentLines.length > 0;
};
