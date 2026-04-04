// Seattle Link Light Rail Tracker - Station Data
// Based on Sound Transit's ST3 plan, status as of April 2026

export const LINES = {
  "1-line": {
    name: "1 Line",
    color: "#E31837",
    shortName: "1",
    description: "Alaska Junction - Everett",
  },
  "2-line": {
    name: "2 Line",
    color: "#0053A0",
    shortName: "2",
    description: "Mariner - Redmond",
  },
  "3-line": {
    name: "3 Line",
    color: "#00A651",
    shortName: "3",
    description: "Ballard - Tacoma Dome",
  },
  "4-line": {
    name: "4 Line",
    color: "#F58220",
    shortName: "4",
    description: "Kirkland - Issaquah",
  },
  "t-line": {
    name: "T Line",
    color: "#7B2D8E",
    shortName: "T",
    description: "Tacoma Dome - TCC",
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

export const STATIONS = [
  // ===== 1 Line (Red) - Alaska Junction to Everett =====
  {
    id: "lynnwood-city-center",
    name: "Lynnwood City Center",
    lines: ["1-line", "2-line"],
    lat: 47.8149,
    lng: -122.2953,
    neighborhood: "Lynnwood",
    blurb: "A major shared station on the 1 and 2 Lines in Snohomish County. Lynnwood City Center is a growing urban hub with a large transit-oriented development transforming the area around the station.",
    operational: true,
    openedYear: 2024,
    notableFact: "The Lynnwood Link Extension added three new stations and brought light rail to Snohomish County for the first time.",
  },
  {
    id: "mountlake-terrace",
    name: "Mountlake Terrace",
    lines: ["1-line", "2-line"],
    lat: 47.7871,
    lng: -122.3087,
    neighborhood: "Mountlake Terrace",
    blurb: "Serving the suburban community of Mountlake Terrace with a large park-and-ride facility. The station connects commuters to downtown Seattle in about 30 minutes.",
    operational: true,
    openedYear: 2024,
    notableFact: null,
  },
  {
    id: "shoreline-north-185th",
    name: "Shoreline North/185th",
    lines: ["1-line", "2-line"],
    lat: 47.7680,
    lng: -122.3456,
    neighborhood: "Shoreline",
    blurb: "Located at NE 185th Street in Shoreline, this station serves the northern part of the city and has spurred significant transit-oriented development plans.",
    operational: true,
    openedYear: 2024,
    notableFact: null,
  },
  {
    id: "shoreline-south-148th",
    name: "Shoreline South/148th",
    lines: ["1-line", "2-line"],
    lat: 47.7544,
    lng: -122.3456,
    neighborhood: "Shoreline",
    blurb: "Serving southern Shoreline near 148th Street. The surrounding area is undergoing redevelopment with new housing and mixed-use projects.",
    operational: true,
    openedYear: 2024,
    notableFact: null,
  },
  {
    id: "pinehurst",
    name: "Pinehurst",
    lines: ["1-line", "2-line"],
    lat: 47.7220,
    lng: -122.3330,
    neighborhood: "Pinehurst",
    blurb: "An infill station serving the Pinehurst neighborhood between Shoreline and Northgate. Provides additional transit access to this growing residential area.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "northgate",
    name: "Northgate",
    lines: ["1-line", "2-line"],
    lat: 47.7084,
    lng: -122.3275,
    neighborhood: "Northgate",
    blurb: "A major transit hub adjacent to Northgate Mall and the new NHL Kraken community ice rink. The pedestrian bridge connects to North Seattle College.",
    operational: true,
    openedYear: 2021,
    notableFact: "The Northgate pedestrian bridge is one of the longest in the Pacific Northwest at over 1,800 feet.",
  },
  {
    id: "roosevelt",
    name: "Roosevelt",
    lines: ["1-line", "2-line"],
    lat: 47.6766,
    lng: -122.3168,
    neighborhood: "Roosevelt",
    blurb: "A charming residential neighborhood with local restaurants and shops along Roosevelt Way. Named after President Theodore Roosevelt.",
    operational: true,
    openedYear: 2021,
    notableFact: null,
  },
  {
    id: "u-district",
    name: "U District",
    lines: ["1-line", "2-line"],
    lat: 47.6611,
    lng: -122.3155,
    neighborhood: "University District",
    blurb: "The vibrant heart of Seattle's University District, steps from the Ave (University Way) with its eclectic mix of bookstores, restaurants, and student hangouts.",
    operational: true,
    openedYear: 2021,
    notableFact: "The U District station is 93 feet deep, making it one of the deepest stations in the system.",
  },
  {
    id: "university-of-washington",
    name: "University of Washington",
    lines: ["1-line", "2-line"],
    lat: 47.6498,
    lng: -122.3039,
    neighborhood: "University of Washington",
    blurb: "Located at the southeast edge of the UW campus near Husky Stadium. Provides direct access to one of the top research universities in the world.",
    operational: true,
    openedYear: 2016,
    notableFact: "This station opened as part of the University Link Extension in 2016, cutting the UW-to-downtown commute to just 8 minutes.",
  },
  {
    id: "capitol-hill",
    name: "Capitol Hill",
    lines: ["1-line", "2-line"],
    lat: 47.6195,
    lng: -122.3208,
    neighborhood: "Capitol Hill",
    blurb: "Seattle's most vibrant and eclectic neighborhood, known for its nightlife, diverse dining scene, and the iconic Pike/Pine corridor. A cultural hub of the city.",
    operational: true,
    openedYear: 2016,
    notableFact: "Capitol Hill station features artwork by artist Mike Ross, including a kinetic installation visible from Broadway.",
  },
  {
    id: "westlake",
    name: "Westlake",
    lines: ["1-line", "2-line", "3-line"],
    lat: 47.6113,
    lng: -122.3373,
    neighborhood: "Downtown Seattle",
    blurb: "The bustling heart of downtown Seattle. Westlake is the system's busiest station, connecting to the Monorail, bus routes, and the retail core around Westlake Center and Pike Place Market.",
    operational: true,
    openedYear: 2009,
    notableFact: "Westlake is the busiest Link station and will serve as a transfer point between the 1 Line and future 3 Line.",
  },
  {
    id: "university-street",
    name: "Symphony",
    lines: ["1-line", "2-line"],
    lat: 47.6076,
    lng: -122.3358,
    neighborhood: "Downtown Seattle",
    blurb: "Renamed from University Street to Symphony in 2024, this station serves Benaroya Hall, the Seattle Art Museum, and the downtown financial district.",
    operational: true,
    openedYear: 2009,
    notableFact: "Renamed to Symphony to better reflect its proximity to Benaroya Hall, home of the Seattle Symphony.",
  },
  {
    id: "pioneer-square",
    name: "Pioneer Square",
    lines: ["1-line", "2-line"],
    lat: 47.6021,
    lng: -122.3316,
    neighborhood: "Pioneer Square",
    blurb: "Seattle's original neighborhood, featuring historic red-brick buildings, art galleries, and the famous Underground Tour. The birthplace of the city.",
    operational: true,
    openedYear: 2009,
    notableFact: null,
  },
  {
    id: "international-district",
    name: "International District/Chinatown",
    lines: ["1-line", "2-line", "3-line"],
    lat: 47.5981,
    lng: -122.3283,
    neighborhood: "Chinatown-International District",
    blurb: "A culturally rich neighborhood home to Seattle's Chinese, Japanese, Vietnamese, and Filipino communities. The Wing Luke Museum and Uwajimaya grocery are neighborhood landmarks.",
    operational: true,
    openedYear: 2009,
    notableFact: "This station will become a major transfer hub when the 3 Line opens with its new downtown tunnel.",
  },
  {
    id: "stadium",
    name: "Stadium",
    lines: ["1-line"],
    lat: 47.5918,
    lng: -122.3275,
    neighborhood: "SoDo",
    blurb: "Serving T-Mobile Park (Mariners) and Lumen Field (Seahawks/Sounders). The go-to station for Seattle's major sporting events and concerts.",
    operational: true,
    openedYear: 2009,
    notableFact: "On game days, this station sees ridership spikes of up to 10x normal levels.",
  },
  {
    id: "sodo",
    name: "SODO",
    lines: ["1-line", "3-line"],
    lat: 47.5806,
    lng: -122.3275,
    neighborhood: "SoDo",
    blurb: "An industrial district south of downtown that's gradually evolving. SODO station provides access to the area's warehouses, breweries, and the Starbucks headquarters campus.",
    operational: true,
    openedYear: 2009,
    notableFact: null,
  },
  {
    id: "beacon-hill",
    name: "Beacon Hill",
    lines: ["1-line", "3-line"],
    lat: 47.5684,
    lng: -122.3114,
    neighborhood: "Beacon Hill",
    blurb: "A diverse hilltop neighborhood with stunning views of downtown and Mount Rainier. Known for its community gardens, local restaurants, and the Jefferson Park golf course.",
    operational: true,
    openedYear: 2009,
    notableFact: "Beacon Hill station is 160 feet underground, making it the deepest station in the entire Link system.",
  },
  {
    id: "mount-baker",
    name: "Mount Baker",
    lines: ["1-line", "3-line"],
    lat: 47.5762,
    lng: -122.2976,
    neighborhood: "Mount Baker",
    blurb: "A residential neighborhood with growing commercial activity along Rainier Avenue. The station connects to multiple bus routes serving the Rainier Valley.",
    operational: true,
    openedYear: 2009,
    notableFact: null,
  },
  {
    id: "columbia-city",
    name: "Columbia City",
    lines: ["1-line", "3-line"],
    lat: 47.5592,
    lng: -122.2922,
    neighborhood: "Columbia City",
    blurb: "One of Seattle's most diverse and beloved neighborhoods. Columbia City features a thriving main street with independent shops, restaurants from around the world, and a historic cinema.",
    operational: true,
    openedYear: 2009,
    notableFact: "Columbia City was named one of the best neighborhoods in America by multiple publications for its diversity and walkability.",
  },
  {
    id: "graham-street",
    name: "Graham Street",
    lines: ["1-line", "3-line"],
    lat: 47.5489,
    lng: -122.2868,
    neighborhood: "Hillman City",
    blurb: "A planned infill station between Columbia City and Othello, serving the Hillman City neighborhood. Part of a long-planned effort to improve transit access in the Rainier Valley.",
    operational: false,
    openedYear: null,
    notableFact: "Graham Street has been a planned infill station since the original Link light rail opened in 2009.",
  },
  {
    id: "othello",
    name: "Othello",
    lines: ["1-line", "3-line"],
    lat: 47.5382,
    lng: -122.2812,
    neighborhood: "Othello",
    blurb: "A multicultural neighborhood in the Rainier Valley with a mix of East African, Southeast Asian, and Latin American communities. Home to numerous ethnic grocery stores and restaurants.",
    operational: true,
    openedYear: 2009,
    notableFact: null,
  },
  {
    id: "rainier-beach",
    name: "Rainier Beach",
    lines: ["1-line", "3-line"],
    lat: 47.5227,
    lng: -122.2682,
    neighborhood: "Rainier Beach",
    blurb: "The southernmost Seattle neighborhood on the Link light rail. Rainier Beach is known for its community resilience, urban farm projects, and proximity to Lake Washington.",
    operational: true,
    openedYear: 2009,
    notableFact: null,
  },
  {
    id: "boeing-access-road",
    name: "Boeing Access Road",
    lines: ["1-line", "3-line"],
    lat: 47.5030,
    lng: -122.2734,
    neighborhood: "Georgetown",
    blurb: "A planned station between Rainier Beach and Tukwila, near Boeing's facilities along East Marginal Way. Will improve transit access to the Duwamish industrial area.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "tukwila-intl-blvd",
    name: "Tukwila International Blvd",
    lines: ["1-line", "3-line"],
    lat: 47.4649,
    lng: -122.2886,
    neighborhood: "Tukwila",
    blurb: "Serving the diverse Tukwila community along International Boulevard. The area is one of the most ethnically diverse zip codes in the United States.",
    operational: true,
    openedYear: 2009,
    notableFact: null,
  },
  {
    id: "seatac-airport",
    name: "SeaTac/Airport",
    lines: ["1-line", "3-line"],
    lat: 47.4445,
    lng: -122.2968,
    neighborhood: "SeaTac",
    blurb: "Direct access to Seattle-Tacoma International Airport via a skybridge to the terminal. One of the most-used stations for visitors arriving in the region.",
    operational: true,
    openedYear: 2009,
    notableFact: "SeaTac is one of the few US airports with direct light rail service to downtown, with a ride time of about 38 minutes.",
  },
  {
    id: "angle-lake",
    name: "Angle Lake",
    lines: ["1-line", "3-line"],
    lat: 47.4254,
    lng: -122.2968,
    neighborhood: "SeaTac",
    blurb: "Named after the nearby Angle Lake, a popular swimming spot. The station includes a large parking garage and serves as a gateway to the southern suburbs.",
    operational: true,
    openedYear: 2016,
    notableFact: null,
  },
  {
    id: "kent-des-moines",
    name: "Kent/Des Moines",
    lines: ["1-line", "3-line"],
    lat: 47.4100,
    lng: -122.2960,
    neighborhood: "Kent/Des Moines",
    blurb: "Serving the communities of Kent and Des Moines along the Highway 99 corridor. Part of the Federal Way Link Extension that brought rail further south.",
    operational: true,
    openedYear: 2026,
    notableFact: null,
  },
  {
    id: "star-lake",
    name: "Star Lake",
    lines: ["1-line", "3-line"],
    lat: 47.3942,
    lng: -122.2944,
    neighborhood: "Star Lake",
    blurb: "A suburban station serving the Star Lake area between Kent and Federal Way. Features a park-and-ride facility for South King County commuters.",
    operational: true,
    openedYear: 2026,
    notableFact: null,
  },
  {
    id: "federal-way-downtown",
    name: "Federal Way Downtown",
    lines: ["1-line", "3-line"],
    lat: 47.3174,
    lng: -122.3032,
    neighborhood: "Federal Way",
    blurb: "A major station on the 1 and 3 Lines. Federal Way Downtown station anchors the city's growing downtown core and connects to bus service throughout South King County.",
    operational: true,
    openedYear: 2026,
    notableFact: "The Federal Way Link Extension added 7.8 miles of light rail and three new stations.",
  },
  {
    id: "south-federal-way",
    name: "South Federal Way",
    lines: ["1-line", "3-line"],
    lat: 47.2960,
    lng: -122.3120,
    neighborhood: "Federal Way",
    blurb: "Planned station south of Federal Way Downtown, extending the 3 Line further toward Tacoma. Part of the Tacoma Dome Link Extension.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },

  // ===== 2 Line (Blue) - East Link Operational Segment =====
  {
    id: "judkins-park",
    name: "Judkins Park",
    lines: ["2-line"],
    lat: 47.5908,
    lng: -122.3026,
    neighborhood: "Judkins Park",
    blurb: "A key station where the 2 Line diverges east from the downtown tunnel toward Bellevue. Located in the diverse Judkins Park neighborhood with views of Mount Rainier.",
    operational: true,
    openedYear: 2024,
    notableFact: "Judkins Park station is where the 2 Line leaves the shared downtown trunk and begins its cross-lake journey to Bellevue.",
  },
  {
    id: "mercer-island",
    name: "Mercer Island",
    lines: ["2-line"],
    lat: 47.5871,
    lng: -122.2221,
    neighborhood: "Mercer Island",
    blurb: "Located on Mercer Island in the middle of Lake Washington. The station sits in the center of I-90, giving this affluent island community a direct light rail connection to both Seattle and Bellevue.",
    operational: true,
    openedYear: 2024,
    notableFact: "The East Link Extension crosses Lake Washington on the I-90 floating bridge, a first for light rail worldwide.",
  },
  {
    id: "south-bellevue",
    name: "South Bellevue",
    lines: ["2-line", "4-line"],
    lat: 47.5876,
    lng: -122.1773,
    neighborhood: "South Bellevue",
    blurb: "The western anchor of the East Link segment, featuring a large park-and-ride near Mercer Slough Nature Park. Provides a direct connection across Lake Washington.",
    operational: true,
    openedYear: 2024,
    notableFact: "The East Link Extension crosses Lake Washington on the I-90 floating bridge, a first for light rail worldwide.",
  },
  {
    id: "east-main",
    name: "East Main",
    lines: ["2-line", "4-line"],
    lat: 47.6059,
    lng: -122.1998,
    neighborhood: "Bellevue",
    blurb: "Serving the residential areas of south-central Bellevue, near Surrey Downs Park and Old Bellevue with its boutique shopping district.",
    operational: true,
    openedYear: 2024,
    notableFact: null,
  },
  {
    id: "bellevue-downtown",
    name: "Bellevue Downtown",
    lines: ["2-line", "4-line"],
    lat: 47.6148,
    lng: -122.1965,
    neighborhood: "Downtown Bellevue",
    blurb: "The heart of the Eastside's largest city. Downtown Bellevue has transformed into a major urban center with gleaming high-rises, Bellevue Square, and a thriving restaurant scene.",
    operational: true,
    openedYear: 2024,
    notableFact: "Bellevue is now the 5th largest city in Washington state and a major tech hub hosting Amazon, Meta, and other companies.",
  },
  {
    id: "wilburton",
    name: "Wilburton",
    lines: ["2-line", "4-line"],
    lat: 47.6175,
    lng: -122.1876,
    neighborhood: "Wilburton",
    blurb: "An evolving neighborhood east of downtown Bellevue, home to the Bellevue Botanical Garden and the new Wilburton Village mixed-use development.",
    operational: true,
    openedYear: 2024,
    notableFact: null,
  },
  {
    id: "spring-district",
    name: "Spring District/120th",
    lines: ["2-line"],
    lat: 47.6264,
    lng: -122.1823,
    neighborhood: "Spring District",
    blurb: "A brand-new neighborhood built around the station. The Spring District is home to a major Facebook/Meta campus and the new Global Innovation Exchange.",
    operational: true,
    openedYear: 2024,
    notableFact: "The Spring District is one of the first neighborhoods in the region designed from the ground up around a light rail station.",
  },
  {
    id: "bel-red",
    name: "Bel-Red/130th",
    lines: ["2-line"],
    lat: 47.6313,
    lng: -122.1706,
    neighborhood: "Bel-Red",
    blurb: "Formerly an industrial and auto-row corridor, Bel-Red is rapidly transforming into a mixed-use neighborhood with new apartments, shops, and creative spaces.",
    operational: true,
    openedYear: 2024,
    notableFact: null,
  },
  {
    id: "overlake-village",
    name: "Overlake Village",
    lines: ["2-line"],
    lat: 47.6369,
    lng: -122.1544,
    neighborhood: "Overlake",
    blurb: "Adjacent to the Microsoft main campus in Redmond. Overlake Village is a new urban center growing up around the station with housing, retail, and office space.",
    operational: true,
    openedYear: 2024,
    notableFact: null,
  },
  {
    id: "redmond-technology",
    name: "Redmond Technology",
    lines: ["2-line"],
    lat: 47.6439,
    lng: -122.1345,
    neighborhood: "Redmond",
    blurb: "Serving the Redmond technology corridor including Microsoft and Nintendo of America. A major employment hub on the Eastside.",
    operational: true,
    openedYear: 2024,
    notableFact: "Microsoft's main campus, adjacent to this station, employs over 50,000 people.",
  },
  {
    id: "downtown-redmond",
    name: "Downtown Redmond",
    lines: ["2-line"],
    lat: 47.6739,
    lng: -122.1185,
    neighborhood: "Downtown Redmond",
    blurb: "The eastern terminus of the operational 2 Line segment. Downtown Redmond offers a charming small-town feel with Saturday farmers markets and proximity to the Sammamish River Trail.",
    operational: true,
    openedYear: 2024,
    notableFact: "Redmond is known as the 'Bicycle Capital of the Northwest' with extensive trail connections from this station.",
  },

  // ===== 1+2 Line - Planned Northern Extensions =====
  {
    id: "ash-way",
    name: "Ash Way",
    lines: ["1-line", "2-line"],
    lat: 47.8280,
    lng: -122.2770,
    neighborhood: "Ash Way",
    blurb: "Planned station on the shared 1/2 Line corridor between Lynnwood and Mariner. Will feature a park-and-ride facility serving south Snohomish County commuters.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "mariner",
    name: "Mariner",
    lines: ["1-line", "2-line"],
    lat: 47.8563,
    lng: -122.2688,
    neighborhood: "Mariner",
    blurb: "A planned station in the Mariner area of south Snohomish County. Will serve as a key park-and-ride location for Eastside-bound commuters.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "airport-road",
    name: "Airport Road",
    lines: ["1-line"],
    lat: 47.8700,
    lng: -122.2600,
    neighborhood: "Everett",
    blurb: "Planned station on the 1 Line extension north of Mariner. Will serve the Airport Road corridor and surrounding commercial areas in south Snohomish County.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "evergreen",
    name: "Evergreen",
    lines: ["1-line"],
    lat: 47.8850,
    lng: -122.2550,
    neighborhood: "Everett",
    blurb: "Planned station serving the Evergreen area between Airport Road and Paine Field. Part of the Everett Link Extension bringing light rail to Snohomish County's largest city.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "paine-field",
    name: "Paine Field",
    lines: ["1-line"],
    lat: 47.9060,
    lng: -122.2700,
    neighborhood: "Everett",
    blurb: "Planned station near Paine Field airport and Boeing's Everett factory, the largest building in the world by volume. Will serve major aerospace manufacturing employment.",
    operational: false,
    openedYear: null,
    notableFact: "The nearby Boeing Everett Factory is where 747, 767, 777, and 787 Dreamliner aircraft are assembled.",
  },
  {
    id: "mukilteo",
    name: "Mukilteo",
    lines: ["1-line"],
    lat: 47.9250,
    lng: -122.2900,
    neighborhood: "Mukilteo",
    blurb: "Planned station in Mukilteo, near the Washington State Ferries terminal serving Whidbey Island. Will connect ferry commuters directly to the light rail network.",
    operational: false,
    openedYear: null,
    notableFact: "Mukilteo is home to a major Washington State Ferries terminal connecting to Whidbey Island.",
  },
  {
    id: "everett",
    name: "Everett",
    lines: ["1-line"],
    lat: 47.9750,
    lng: -122.1970,
    neighborhood: "Everett",
    blurb: "The planned northern terminus of the 2 Line in downtown Everett. Will connect the largest city in Snohomish County directly to the Eastside via light rail.",
    operational: false,
    openedYear: null,
    notableFact: "When complete, riders will be able to travel from Everett to Redmond entirely by light rail.",
  },
  {
    id: "south-kirkland",
    name: "South Kirkland",
    lines: ["4-line"],
    lat: 47.6660,
    lng: -122.1870,
    neighborhood: "South Kirkland",
    blurb: "Planned station along the former BNSF rail corridor. Will serve South Kirkland's growing residential and commercial areas near the Cross Kirkland Corridor trail.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "kirkland",
    name: "Totem Lake/Kirkland",
    lines: ["4-line"],
    lat: 47.6810,
    lng: -122.2087,
    neighborhood: "Totem Lake",
    blurb: "Planned station in the Totem Lake area of Kirkland, near the redeveloped Totem Lake Mall and Evergreen Health Medical Center.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "issaquah",
    name: "Issaquah",
    lines: ["4-line"],
    lat: 47.5310,
    lng: -122.0325,
    neighborhood: "Issaquah",
    blurb: "Planned station in downtown Issaquah at the base of the Cascades foothills. Gateway to Tiger Mountain trails, Salmon Days festival, and the charming historic downtown.",
    operational: false,
    openedYear: null,
    notableFact: "Issaquah hosts the annual Salmon Days festival celebrating the return of salmon to Issaquah Creek.",
  },
  {
    id: "issaquah-highlands",
    name: "Issaquah Highlands",
    lines: ["4-line"],
    lat: 47.5405,
    lng: -122.0150,
    neighborhood: "Issaquah Highlands",
    blurb: "Planned eastern terminus station serving the master-planned Issaquah Highlands community, a mixed-use development in the Cascade foothills.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },

  // ===== 4 Line (Orange) - Kirkland to Issaquah =====
  {
    id: "ne-85th",
    name: "NE 85th",
    lines: ["4-line"],
    lat: 47.6808,
    lng: -122.1965,
    neighborhood: "Kirkland",
    blurb: "Planned station on the 4 Line in Kirkland near NE 85th Street. Will provide a key connection between the Kirkland area and the Bellevue transit corridor.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "richards",
    name: "Richards",
    lines: ["4-line"],
    lat: 47.5720,
    lng: -122.1600,
    neighborhood: "Richards",
    blurb: "Planned station on the 4 Line between South Bellevue and Eastgate, serving the Factoria and Richards Valley area.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "eastgate",
    name: "Eastgate",
    lines: ["4-line"],
    lat: 47.5558,
    lng: -122.1400,
    neighborhood: "Eastgate",
    blurb: "Planned station at the Eastgate park-and-ride area. Will serve as a major transit connection point for commuters from the I-90 corridor communities.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "lakemont",
    name: "Lakemont",
    lines: ["4-line"],
    lat: 47.5450,
    lng: -122.0780,
    neighborhood: "Lakemont",
    blurb: "Planned station serving the Lakemont residential community between Eastgate and Issaquah in the Cascade foothills.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },

  // ===== 3 Line (Green) - All Planned =====
  {
    id: "ballard",
    name: "Ballard",
    lines: ["3-line"],
    lat: 47.6680,
    lng: -122.3853,
    neighborhood: "Ballard",
    blurb: "Planned northern terminus of the 3 Line in historic Ballard. Known for its maritime heritage, craft breweries, the Ballard Locks, and a thriving Sunday farmers market.",
    operational: false,
    openedYear: null,
    notableFact: "Ballard was originally an independent city that was annexed by Seattle in 1907. Its Scandinavian heritage is still celebrated today.",
  },
  {
    id: "interbay",
    name: "Interbay",
    lines: ["3-line"],
    lat: 47.6510,
    lng: -122.3750,
    neighborhood: "Interbay",
    blurb: "Planned station in the Interbay neighborhood, a narrow corridor between Queen Anne and Magnolia. Home to the Interbay Golf Center and growing mixed-use development.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "smith-cove",
    name: "Smith Cove",
    lines: ["3-line"],
    lat: 47.6385,
    lng: -122.3700,
    neighborhood: "Interbay",
    blurb: "Planned station near the Smith Cove cruise terminal and Expedia headquarters. Will serve the growing Interbay area and provide access to Elliott Bay waterfront.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "seattle-center",
    name: "Seattle Center",
    lines: ["3-line"],
    lat: 47.6217,
    lng: -122.3520,
    neighborhood: "Lower Queen Anne",
    blurb: "Planned station at Seattle Center, home of the Space Needle, Museum of Pop Culture, Pacific Science Center, and Climate Pledge Arena (home of the Seattle Kraken).",
    operational: false,
    openedYear: null,
    notableFact: "Seattle Center was built for the 1962 World's Fair and remains the city's premier arts and entertainment campus.",
  },
  {
    id: "denny",
    name: "Denny",
    lines: ["3-line"],
    lat: 47.6182,
    lng: -122.3395,
    neighborhood: "South Lake Union",
    blurb: "Planned station in the booming South Lake Union / Denny Triangle area. This neighborhood has been transformed by Amazon's headquarters campus and biotech companies.",
    operational: false,
    openedYear: null,
    notableFact: "South Lake Union went from a sleepy warehouse district to one of Seattle's densest neighborhoods in just 15 years.",
  },
  {
    id: "midtown",
    name: "Midtown",
    lines: ["3-line"],
    lat: 47.6095,
    lng: -122.3360,
    neighborhood: "First Hill",
    blurb: "Planned station serving First Hill, Seattle's hospital district. Home to Swedish Medical Center, Virginia Mason, and Harborview Medical Center.",
    operational: false,
    openedYear: null,
    notableFact: "First Hill was originally supposed to get a station in the initial Link plan but was cut due to tunneling difficulties.",
  },
  {
    id: "delridge",
    name: "Delridge",
    lines: ["1-line"],
    lat: 47.5618,
    lng: -122.3433,
    neighborhood: "Delridge",
    blurb: "Planned station in the Delridge neighborhood of West Seattle. A diverse, working-class community with views of the Duwamish River valley and easy access to West Seattle Bridge.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "avalon",
    name: "Avalon",
    lines: ["1-line"],
    lat: 47.5510,
    lng: -122.3370,
    neighborhood: "West Seattle",
    blurb: "Planned station in the Avalon neighborhood of West Seattle, providing a connection point between the Alaska Junction and Delridge communities.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "alaska-junction",
    name: "Alaska Junction",
    lines: ["1-line"],
    lat: 47.5610,
    lng: -122.3870,
    neighborhood: "West Seattle",
    blurb: "Planned station at the heart of West Seattle's Alaska Junction, the neighborhood's walkable village center with local shops, restaurants, and the historic Alaska Junction mural.",
    operational: false,
    openedYear: null,
    notableFact: "West Seattle was an independent city until it was annexed by Seattle in 1907, and many residents maintain a strong sense of separate identity.",
  },
  {
    id: "tacoma-dome",
    name: "Tacoma Dome",
    lines: ["3-line", "t-line"],
    lat: 47.2393,
    lng: -122.4278,
    neighborhood: "Tacoma",
    blurb: "Planned southern terminus of the 3 Line at the Tacoma Dome, connecting to Sounder commuter rail, Amtrak, and local transit. The Tacoma Dome is a major event venue.",
    operational: false,
    openedYear: null,
    notableFact: "When complete, the 3 Line will create a continuous rail corridor from Ballard to Tacoma spanning over 50 miles.",
  },

  // ===== T Line (Purple) - Tacoma Dome to TCC =====
  {
    id: "stadium-district",
    name: "Stadium District",
    lines: ["t-line"],
    lat: 47.2445,
    lng: -122.4310,
    neighborhood: "Tacoma Dome District",
    blurb: "Planned station near the Tacoma Dome, connecting the T Line to the 3 Line and Sounder commuter rail at the Tacoma Dome transit hub.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "tacoma-general",
    name: "Tacoma General",
    lines: ["t-line"],
    lat: 47.2508,
    lng: -122.4382,
    neighborhood: "Stadium District",
    blurb: "Planned station near Tacoma General Hospital and the Stadium District neighborhood, known for its historic Stadium High School.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "s-4th",
    name: "S 4th",
    lines: ["t-line"],
    lat: 47.2520,
    lng: -122.4395,
    neighborhood: "Downtown Tacoma",
    blurb: "Planned station along South 4th Street in downtown Tacoma, providing access to the central business district.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "old-city-hall",
    name: "Old City Hall",
    lines: ["t-line"],
    lat: 47.2525,
    lng: -122.4402,
    neighborhood: "Downtown Tacoma",
    blurb: "Planned station near Tacoma's historic Old City Hall, a Romanesque Revival landmark built in 1893.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "theater-district",
    name: "Theater District",
    lines: ["t-line"],
    lat: 47.2530,
    lng: -122.4410,
    neighborhood: "Downtown Tacoma",
    blurb: "A central T Line station in downtown Tacoma's Theater District. Near the Tacoma Art Museum, Museum of Glass, and the historic Pantages Theater.",
    operational: true,
    openedYear: 2003,
    notableFact: "The T Line was the first modern light rail line in the Puget Sound region, opening in 2003.",
  },
  {
    id: "6th-ave",
    name: "6th Avenue",
    lines: ["t-line"],
    lat: 47.2540,
    lng: -122.4450,
    neighborhood: "Downtown Tacoma",
    blurb: "Planned station along 6th Avenue, a vibrant commercial corridor in Tacoma with independent shops, restaurants, and galleries.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "convention-center",
    name: "Convention Center",
    lines: ["t-line"],
    lat: 47.2515,
    lng: -122.4480,
    neighborhood: "Downtown Tacoma",
    blurb: "Planned station near the Greater Tacoma Convention Center and UW Tacoma campus.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "union-station",
    name: "Union Station",
    lines: ["t-line"],
    lat: 47.2549,
    lng: -122.4325,
    neighborhood: "Downtown Tacoma",
    blurb: "Located at Tacoma's beautifully restored Union Station, a Beaux-Arts landmark now housing a federal courthouse with Chihuly glass art installations in its grand hall.",
    operational: true,
    openedYear: 2003,
    notableFact: "Union Station features a permanent installation of Dale Chihuly glass art, free and open to the public.",
  },
  {
    id: "south-25th",
    name: "South 25th Street",
    lines: ["t-line"],
    lat: 47.2487,
    lng: -122.4535,
    neighborhood: "Tacoma",
    blurb: "Serving the residential neighborhoods south of downtown Tacoma. Part of the Hilltop Link Extension that expanded Tacoma's streetcar network.",
    operational: true,
    openedYear: 2023,
    notableFact: null,
  },
  {
    id: "mlk-jr-way",
    name: "Martin Luther King Jr. Way",
    lines: ["t-line"],
    lat: 47.2430,
    lng: -122.4590,
    neighborhood: "Hilltop",
    blurb: "Serving the historically significant Hilltop neighborhood along MLK Jr. Way. The Hilltop has a rich African American heritage and is experiencing revitalization.",
    operational: true,
    openedYear: 2023,
    notableFact: null,
  },
  {
    id: "hilltop",
    name: "Hilltop District",
    lines: ["t-line"],
    lat: 47.2448,
    lng: -122.4710,
    neighborhood: "Hilltop",
    blurb: "A key T Line station in Tacoma's Hilltop neighborhood, near Tacoma General Hospital. The extension brought transit access to this historically underserved community.",
    operational: true,
    openedYear: 2023,
    notableFact: "The Hilltop Link Extension was a key equity project, reconnecting a neighborhood that lost its streetcar service in 1938.",
  },
  {
    id: "stevens",
    name: "Stevens",
    lines: ["t-line"],
    lat: 47.2420,
    lng: -122.4760,
    neighborhood: "South Tacoma",
    blurb: "Planned station on the T Line extension west of Hilltop, serving the Stevens Street corridor toward Tacoma Community College.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "union-ave",
    name: "Union Avenue",
    lines: ["t-line"],
    lat: 47.2400,
    lng: -122.4810,
    neighborhood: "South Tacoma",
    blurb: "Planned station along Union Avenue on the T Line extension to Tacoma Community College.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "ainsworth",
    name: "Ainsworth",
    lines: ["t-line"],
    lat: 47.2385,
    lng: -122.4860,
    neighborhood: "South Tacoma",
    blurb: "Planned station in the Ainsworth neighborhood on the T Line extension to Tacoma Community College.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "sprague",
    name: "Sprague",
    lines: ["t-line"],
    lat: 47.2365,
    lng: -122.4910,
    neighborhood: "South Tacoma",
    blurb: "Planned station along Sprague Avenue on the T Line extension to Tacoma Community College.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "st-joseph",
    name: "St Joseph",
    lines: ["t-line"],
    lat: 47.2345,
    lng: -122.4960,
    neighborhood: "South Tacoma",
    blurb: "Planned station near St. Joseph on the T Line extension to Tacoma Community College.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "pearl",
    name: "Pearl",
    lines: ["t-line"],
    lat: 47.2328,
    lng: -122.5010,
    neighborhood: "South Tacoma",
    blurb: "Planned station along Pearl Street, one of the final stops before Tacoma Community College on the T Line extension.",
    operational: false,
    openedYear: null,
    notableFact: null,
  },
  {
    id: "tacoma-cc",
    name: "Tacoma Community College",
    lines: ["t-line"],
    lat: 47.2310,
    lng: -122.5090,
    neighborhood: "South Tacoma",
    blurb: "The western terminus of the T Line at Tacoma Community College (TCC). Extends light rail access to one of Tacoma's largest educational institutions.",
    operational: false,
    openedYear: null,
    notableFact: "When complete, the T Line will span from Tacoma Dome to Tacoma Community College, connecting major destinations across the city.",
  },
];

// Polyline paths for each line (ordered station coordinates with some intermediate waypoints)
export const LINE_PATHS = {
  "1-line": [
    // Segment 1: Everett to Federal Way via Rainier Valley (Red - main trunk)
    [
      [47.9750, -122.1970],  // Everett
      [47.9250, -122.2900],  // Mukilteo
      [47.9060, -122.2700],  // Paine Field
      [47.8850, -122.2550],  // Evergreen
      [47.8700, -122.2600],  // Airport Road
      [47.8563, -122.2688],  // Mariner
      [47.8280, -122.2770],  // Ash Way
      [47.8149, -122.2953],  // Lynnwood City Center
      [47.7871, -122.3087],  // Mountlake Terrace
      [47.7680, -122.3456],  // Shoreline North/185th
      [47.7544, -122.3456],  // Shoreline South/148th
      [47.7220, -122.3330],  // Pinehurst
      [47.7084, -122.3275],  // Northgate
      [47.6766, -122.3168],  // Roosevelt
      [47.6611, -122.3155],  // U District
      [47.6498, -122.3039],  // University of Washington
      [47.6350, -122.3120],  // waypoint - Montlake
      [47.6195, -122.3208],  // Capitol Hill
      [47.6113, -122.3373],  // Westlake
      [47.6076, -122.3358],  // Symphony
      [47.6021, -122.3316],  // Pioneer Square
      [47.5981, -122.3283],  // International District
      [47.5918, -122.3275],  // Stadium
      [47.5806, -122.3275],  // SODO
      [47.5750, -122.3200],  // waypoint
      [47.5684, -122.3114],  // Beacon Hill
      [47.5762, -122.2976],  // Mount Baker
      [47.5592, -122.2922],  // Columbia City
      [47.5489, -122.2868],  // Graham Street
      [47.5382, -122.2812],  // Othello
      [47.5227, -122.2682],  // Rainier Beach
      [47.5030, -122.2734],  // Boeing Access Road
      [47.4649, -122.2886],  // Tukwila Intl Blvd
      [47.4445, -122.2968],  // SeaTac Airport
      [47.4254, -122.2968],  // Angle Lake
      [47.4100, -122.2960],  // Kent/Des Moines
      [47.3942, -122.2944],  // Star Lake
      [47.3550, -122.2980],  // waypoint
      [47.3174, -122.3032],  // Federal Way Downtown
      [47.2960, -122.3120],  // South Federal Way
    ],
    // Segment 2: SODO to Alaska Junction (Red - West Seattle branch)
    [
      [47.5806, -122.3275],  // SODO
      [47.5618, -122.3433],  // Delridge
      [47.5510, -122.3370],  // Avalon
      [47.5610, -122.3870],  // Alaska Junction
    ],
  ],
  "2-line": [
    // Mariner to Downtown Redmond (Blue)
    [47.8563, -122.2688],  // Mariner
    [47.8280, -122.2770],  // Ash Way
    [47.8149, -122.2953],  // Lynnwood City Center
    [47.7871, -122.3087],  // Mountlake Terrace
    [47.7680, -122.3456],  // Shoreline North/185th
    [47.7544, -122.3456],  // Shoreline South/148th
    [47.7220, -122.3330],  // Pinehurst
    [47.7084, -122.3275],  // Northgate
    [47.6766, -122.3168],  // Roosevelt
    [47.6611, -122.3155],  // U District
    [47.6498, -122.3039],  // University of Washington
    [47.6350, -122.3120],  // waypoint - Montlake
    [47.6195, -122.3208],  // Capitol Hill
    [47.6113, -122.3373],  // Westlake
    [47.6076, -122.3358],  // Symphony
    [47.6021, -122.3316],  // Pioneer Square
    [47.5981, -122.3283],  // International District
    [47.5908, -122.3026],  // Judkins Park
    [47.5871, -122.2221],  // Mercer Island
    [47.5876, -122.1773],  // South Bellevue
    [47.6059, -122.1998],  // East Main
    [47.6148, -122.1965],  // Bellevue Downtown
    [47.6175, -122.1876],  // Wilburton
    [47.6264, -122.1823],  // Spring District
    [47.6313, -122.1706],  // Bel-Red
    [47.6369, -122.1544],  // Overlake Village
    [47.6439, -122.1345],  // Redmond Technology
    [47.6739, -122.1185],  // Downtown Redmond
  ],
  "3-line": [
    // Ballard to Tacoma Dome (Green)
    [47.6680, -122.3853],  // Ballard
    [47.6510, -122.3750],  // Interbay
    [47.6385, -122.3700],  // Smith Cove
    [47.6217, -122.3520],  // Seattle Center
    [47.6182, -122.3395],  // Denny
    [47.6113, -122.3373],  // Westlake (shared)
    [47.6095, -122.3360],  // Midtown
    [47.5981, -122.3283],  // International District (shared)
    [47.5806, -122.3275],  // SODO (shared)
    [47.5750, -122.3200],  // waypoint
    [47.5684, -122.3114],  // Beacon Hill
    [47.5762, -122.2976],  // Mount Baker
    [47.5592, -122.2922],  // Columbia City
    [47.5489, -122.2868],  // Graham Street
    [47.5382, -122.2812],  // Othello
    [47.5227, -122.2682],  // Rainier Beach
    [47.5030, -122.2734],  // Boeing Access Road
    [47.4649, -122.2886],  // Tukwila Intl Blvd
    [47.4445, -122.2968],  // SeaTac Airport
    [47.4254, -122.2968],  // Angle Lake
    [47.4100, -122.2960],  // Kent/Des Moines
    [47.3942, -122.2944],  // Star Lake
    [47.3550, -122.2980],  // waypoint
    [47.3174, -122.3032],  // Federal Way Downtown
    [47.2960, -122.3120],  // South Federal Way
    [47.2700, -122.3600],  // waypoint
    [47.2393, -122.4278],  // Tacoma Dome
  ],
  "4-line": [
    // Kirkland to Issaquah (Orange)
    [47.6810, -122.2087],  // Totem Lake/Kirkland
    [47.6808, -122.1965],  // NE 85th
    [47.6660, -122.1870],  // South Kirkland
    [47.6175, -122.1876],  // Wilburton (shared)
    [47.6148, -122.1965],  // Bellevue Downtown (shared)
    [47.6059, -122.1998],  // East Main (shared)
    [47.5876, -122.1773],  // South Bellevue (shared)
    [47.5720, -122.1600],  // Richards
    [47.5558, -122.1400],  // Eastgate
    [47.5450, -122.0780],  // Lakemont
    [47.5310, -122.0325],  // Issaquah
    [47.5405, -122.0150],  // Issaquah Highlands
  ],
  "t-line": [
    // Tacoma Dome to TCC (Purple)
    [47.2393, -122.4278],  // Tacoma Dome
    [47.2445, -122.4310],  // Stadium District
    [47.2508, -122.4382],  // Tacoma General
    [47.2520, -122.4395],  // S 4th
    [47.2525, -122.4402],  // Old City Hall
    [47.2530, -122.4410],  // Theater District
    [47.2540, -122.4450],  // 6th Avenue
    [47.2515, -122.4480],  // Convention Center
    [47.2549, -122.4325],  // Union Station
    [47.2510, -122.4430],  // waypoint
    [47.2487, -122.4535],  // South 25th
    [47.2430, -122.4590],  // MLK Jr Way
    [47.2448, -122.4710],  // Hilltop District
    [47.2420, -122.4760],  // Stevens
    [47.2400, -122.4810],  // Union Avenue
    [47.2385, -122.4860],  // Ainsworth
    [47.2365, -122.4910],  // Sprague
    [47.2345, -122.4960],  // St Joseph
    [47.2328, -122.5010],  // Pearl
    [47.2310, -122.5090],  // Tacoma Community College
  ],
};
