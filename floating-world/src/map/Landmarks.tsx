// Hand-inked landmarks: the silhouettes that make the diagram unmistakably
// Seattle — downtown's massed towers, the Space Needle, the SODO stadiums,
// UW's campus and Husky Stadium, SeaTac's runways and terminal, the working
// waterfront's gantry cranes, the Great Wheel, Gas Works' rusted drums, the
// Amazon Spheres, Bellevue's second skyline across the lake for the 2 Line,
// the region's big malls (Alderwood up north, Southcenter down in Tukwila), a
// handful of neighborhood haunts strung along the line (the Kraken's
// Iceplex at Northgate, brewpubs and Broadway cafés), Pike Place Market on the
// waterfront bluff, Boeing Field's runways and the Museum of Flight, the city's
// bridges (the I-90 and SR-520 floating spans across Lake Washington and the
// ship-canal drawbridges), the Ballard Locks where the canal meets the Sound,
// the far-shore islands the ferries sail to (Bainbridge, Vashon, Blake), the
// Tacoma Dome ghosted on the far southern horizon past Rainier, and —
// ghosted at real scale on the horizons — Mount Rainier southeast, Mount Baker
// and the Cascade wall east/north, and the Olympics west.
// Toy-scaled like the trains (~4–5× real height,
// the storybook register), merged into ONE geometry / ONE draw call, and
// painted with the same watercolor wash + fog contract as every other
// normal-blended layer. depthWrite stays false (the train model remains the
// scene's only depth writer). A fixed key light from the northwest sky
// shades each face so the massing reads SOLID — blocks with dimension, not
// stains — while the wash keeps the hand-painted surface.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { projectLatLng } from "./network";
import { spreadTacoma } from "./tacomaSpread";
import { CONFIG } from "../world/config";
import { LIVE } from "../world/palettes";
import { sunPhase, sunPhaseAt, getPhaseOverride } from "../world/sun";
import { CLOCK } from "../world/clock";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

// The Great Wheel's hub, shared with its rim lights in map/CityLights.tsx —
// keep these in sync if the wheel ever moves or resizes.
export const WHEEL_LAT = 47.6061;
export const WHEEL_LNG = -122.3426;
export const WHEEL_HUB_Y = 0.26;
export const WHEEL_R = 0.22;
// A stately, unhurried rotation — always turning, never distracting on a
// toy map watched for minutes at a time. 100s (20% faster than the first
// pass's 120s, which read as barely-moving at drift distance).
export const WHEEL_SPIN_PERIOD_S = 100;

const ss = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aRainier;
  attribute float aBaker;
  attribute float aTacoma;
  varying float vRainier;
  varying float vBaker;
  varying float vTacoma;
  varying float vY;
  varying vec3 vNormal;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vY = world.y;
    vRainier = aRainier;
    vBaker = aBaker;
    vTacoma = aTacoma;
    vNormal = normalize(normalMatrix * normal); // world-space normal — correct for both the static merged landmarks and the Great Wheel, which rotates
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  varying float vY;
  varying vec3 vNormal;
  varying float vRainier;
  varying float vBaker;
  varying float vTacoma;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform vec2 uRainierAxis; // Rainier's world xz — the axis the veins radiate from
  uniform float uDawn;       // 0..1 Red Fuji vermilion, peaks at sunrise
  uniform float uDusk;       // 0..1 indigo-plum, peaks at sundown

  const vec3 SNOW = vec3(0.97, 0.94, 0.88); // warm white, the way Hokusai capped Fuji
  const vec3 INK  = vec3(0.26, 0.18, 0.12); // sumi keyline
  const vec3 RED_FUJI = vec3(0.72, 0.30, 0.22); // Gaifū Kaisei vermilion flank
  const vec3 PLUM = vec3(0.33, 0.24, 0.42);     // dusk indigo-plum
  // The Tacoma Dome's real palette: the pale timber roof (warm off-white,
  // held just under the bloom line like the airliner liveries) and the
  // rust-red wood concourse wall that rings its base.
  const vec3 TACOMA_ROOF = vec3(0.90, 0.89, 0.85);
  const vec3 TACOMA_WALL = vec3(0.55, 0.30, 0.21);

  void main() {
    float wash = wcFbm(vWorld * 0.8 + vY * 2.1); // pigment mottle per face
    // A fixed key light from the northwest sky: sunlit and shadowed faces
    // diverge, and flat silhouettes become solid massing.
    vec3 n = normalize(vNormal);
    // Shadowed faces still drink plenty of skylight: the floor sits HIGH so no
    // face sinks into the dark ground, while the lit ceiling holds at 1.0 (the
    // massing keeps its dimension without crossing the bloom line).
    float key = 0.66 + 0.34 * max(0.0, dot(n, normalize(vec3(-0.5, 0.8, -0.45))));

    // --- Red Fuji: Rainier's flank takes the sun's pigment — vermilion at
    //     dawn (Hokusai's Gaifū Kaisei), indigo-plum at dusk, pale sepia ghost
    //     at noon (uDawn/uDusk both fall to 0). The tint is heaviest low on the
    //     body and lifts toward the snow, and rides only on the Rainier flag.
    float flankGrad = smoothstep(3.0, 0.3, vY);
    vec3 rainierBody = mix(uColor, mix(uColor, RED_FUJI, 0.9), uDawn * flankGrad);
    rainierBody = mix(rainierBody, mix(uColor, PLUM, 0.85), uDusk * flankGrad);
    vec3 body = mix(uColor, rainierBody, vRainier);
    // --- Tacoma Dome: its real colours, not the generic pigment — the pale
    //     roof up top, the rust-red concourse below, split at the drum line
    //     (~y 0.16 in world units where the hemisphere meets its base ring). ---
    vec3 tacomaBody = mix(TACOMA_WALL, TACOMA_ROOF, smoothstep(0.14, 0.20, vY));
    body = mix(body, tacomaBody, vTacoma);

    vec3 c = body * key * (0.85 + 0.3 * wash);
    // Watercolor still pools faintly at the base.
    c *= mix(1.08, 0.94, smoothstep(0.0, 0.9, vY));

    // --- Snow. The Olympics keep the smooth Hokusai cap (atmospheric, half
    //     dissolved). Rainier instead wears RADIATING SNOW-VEINS: a solid
    //     summit cap breaking into downward tongues along angular channels,
    //     the way the woodcuts drew Fuji's snowfields streaking down the flank.
    vec2 d = vWorld - uRainierAxis;
    float ang = atan(d.y, d.x);
    float waver = wcNoise(vec2(ang * 3.0, vY * 0.5));       // tongues aren't ruler-straight
    float channel = wcFbm(vec2(ang * 8.0 + waver * 1.5, 2.3));
    float solidCap = smoothstep(2.5, 3.0, vY);              // solid white up top
    float tongue = smoothstep(1.3, 2.7, vY);                // fade zone for the fingers
    float thr = mix(0.34, 0.9, 1.0 - tongue);               // deeper down, only the strongest veins hold
    float veinSnow = max(solidCap, smoothstep(thr, thr + 0.12, channel) * tongue);
    float olympicSnow = smoothstep(1.4, 3.4, vY) * 0.93;
    // Mount Baker: a bold, near-solid Hokusai cap sliding far down the flank —
    // a COOL second Fuji on the northern horizon, with none of Rainier's dawn
    // vermilion (the body tint below rides on vRainier alone).
    float bakerSnow = max(smoothstep(2.2, 2.7, vY), smoothstep(1.1, 2.7, vY) * 0.9);
    float snowAmt = mix(olympicSnow, veinSnow, vRainier);
    snowAmt = mix(snowAmt, bakerSnow, vBaker);
    c = mix(c, SNOW, snowAmt);

    // --- Sumi keyline: a fresnel rim inks Rainier's silhouette so it reads as
    //     the DRAWN hero of the sheet, not an atmospheric stain like the
    //     Olympics ghosting the far horizon. Bold in linework, not in light.
    vec3 wpos = vec3(vWorld.x, vY, vWorld.y);
    vec3 view = normalize(cameraPosition - wpos);
    float rim = smoothstep(0.55, 0.98, 1.0 - max(0.0, dot(n, view))) * max(max(vRainier, vBaker), vTacoma * 0.7);
    c = mix(c, INK, rim * 0.32);

    float a = uOpacity * (0.94 + 0.12 * wash);
    gl_FragColor = vec4(mix(c, uFog, fogFactor()), a);
  }
`;

/** A footprint-anchored box: base sits on the paper at (lat, lng). */
function tower(lat: number, lng: number, w: number, h: number, d: number, yaw = 0) {
  const { x, z } = projectLatLng(lat, lng);
  const geo = new THREE.BoxGeometry(w, h, d);
  if (yaw) geo.rotateY(yaw);
  geo.translate(x, h / 2, z);
  return geo;
}

/** A little conifer: a short trunk under a stacked pair of cones — the ragged
 *  evergreen massing that skirts every Puget Sound town. Kept small so it reads
 *  as a tree, not a peak; carries no mountain flag, so it takes the generic
 *  landmark pigment (a dark green-ink wash) rather than any snowline paint. */
function conifer(lat: number, lng: number, h: number, spread = 0) {
  const { x, z } = projectLatLng(lat, lng);
  const trunk = new THREE.CylinderGeometry(h * 0.05, h * 0.07, h * 0.3, 5);
  trunk.translate(0, h * 0.15, 0);
  const lower = new THREE.ConeGeometry(h * 0.42, h * 0.6, 6);
  lower.translate(0, h * 0.5, 0);
  const upper = new THREE.ConeGeometry(h * 0.3, h * 0.55, 6);
  upper.translate(0, h * 0.8, 0);
  const geo = mergeGeometries([trunk, lower, upper], false)!;
  trunk.dispose();
  lower.dispose();
  upper.dispose();
  geo.translate(x, 0, z + spread);
  return geo;
}

/** A mountain: base-anchored cone, real height in km (the snowline in the
 *  fragment shader does the rest). */
function peak(lat: number, lng: number, r: number, h: number) {
  const { x, z } = projectLatLng(lat, lng);
  const geo = new THREE.ConeGeometry(r, h, 7);
  geo.translate(x, h / 2, z);
  return geo;
}

/** A container gantry crane: leg tower + boom raked skyward, the resting
 *  pose of the working waterfront. boomYaw aims the boom over the water. */
function crane(lat: number, lng: number, boomYaw: number) {
  const { x, z } = projectLatLng(lat, lng);
  const legs = new THREE.BoxGeometry(0.05, 0.3, 0.07);
  legs.translate(0, 0.15, 0);
  const boom = new THREE.BoxGeometry(0.32, 0.018, 0.04);
  boom.rotateZ(0.55);
  boom.translate(0.1, 0.33, 0);
  const geo = mergeGeometries([legs, boom], false)!;
  legs.dispose();
  boom.dispose();
  geo.rotateY(boomYaw);
  geo.translate(x, 0, z);
  return geo;
}

/** A brewery / beer hall: a boxy taproom with a pair of fermentation tanks
 *  standing beside it — the working silhouette every Seattle brewpub shares. */
function brewery(lat: number, lng: number, w: number, h: number, d: number, yaw = 0) {
  const { x, z } = projectLatLng(lat, lng);
  const hall = new THREE.BoxGeometry(w, h, d);
  hall.translate(0, h / 2, 0);
  const tallTank = new THREE.CylinderGeometry(h * 0.26, h * 0.26, h * 1.4, 10);
  tallTank.translate(w * 0.5 + h * 0.32, h * 0.7, -d * 0.12);
  const shortTank = new THREE.CylinderGeometry(h * 0.22, h * 0.22, h * 1.1, 10);
  shortTank.translate(w * 0.5 + h * 0.72, h * 0.55, d * 0.22);
  const geo = mergeGeometries([hall, tallTank, shortTank], false)!;
  hall.dispose();
  tallTank.dispose();
  shortTank.dispose();
  if (yaw) geo.rotateY(yaw);
  geo.translate(x, 0, z);
  return geo;
}

/** A SODO stadium: a low oval seating bowl crowned by one or more curved roof
 *  arches — the silhouette that names the two halls beside the tracks. Each
 *  arch is a half-torus (arc = π), which already stands as an arch in the XY
 *  plane: base endpoints on the ground, peak overhead. We offset it across the
 *  bowl, aim its span, and spring it from the roofline. Lumen Field wears twin
 *  canopies over its stands; T-Mobile Park its single great retractable-roof
 *  arch, the tallest thing in SODO. */
function stadium(
  lat: number,
  lng: number,
  w: number,
  d: number,
  h: number,
  spanYaw: number,
  arches: { R: number; tube: number; off: number }[],
): THREE.BufferGeometry {
  const { x, z } = projectLatLng(lat, lng);
  const parts: THREE.BufferGeometry[] = [];

  // The bowl: a low oval drum, flaring a touch at the base — the raked stands
  // read as solid massing, not a flat pad.
  const r = Math.max(w, d) * 0.5;
  const bowl = new THREE.CylinderGeometry(r, r * 1.06, h, 20);
  bowl.scale(w / (2 * r), 1, d / (2 * r));
  bowl.translate(0, h / 2, 0);
  parts.push(bowl);

  // The roof arch(es): the half-torus spans X and peaks at +Y. Spread it across
  // the bowl (offset along Z), aim the span (spanYaw rotates offset and arch
  // together, so it stays square to the bowl), then lift it to the roofline.
  for (const a of arches) {
    const arch = new THREE.TorusGeometry(a.R, a.tube, 7, 28, Math.PI);
    arch.translate(0, 0, a.off);
    arch.rotateY(spanYaw);
    arch.translate(0, h * 0.88, 0);
    parts.push(arch);
  }

  const geo = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  geo.translate(x, 0, z);
  return geo;
}

/** The Kraken Community Iceplex: three flat-roofed rinks under one long
 *  building — the Seattle Kraken's practice house and headquarters — sitting
 *  at grade beside Northgate Station, on the old mall's parking lots. (Not
 *  perched on the transit garage; it's its own building next to the station.) */
function iceplex(lat: number, lng: number) {
  const { x, z } = projectLatLng(lat, lng);
  const parts: THREE.BufferGeometry[] = [];
  // A low massing block at grade — the shared concourse / ground floor the
  // three rinks rise off of, not a garage the building rides on.
  const base = new THREE.BoxGeometry(0.32, 0.05, 0.2);
  base.translate(0, 0.025, 0);
  parts.push(base);
  for (const dx of [-0.1, 0, 0.1] as const) {
    // Each rink is a flat-roofed hall, the real building's boxy massing.
    const hall = new THREE.BoxGeometry(0.085, 0.1, 0.18);
    hall.translate(dx, 0.1, 0); // floor sits on the concourse top (y = 0.05)
    parts.push(hall);
  }
  const geo = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  geo.translate(x, 0, z);
  return geo;
}

// Bridges span WATER, and the water sheet sits at CONFIG.basemap.waterY — NOT
// the y=0 ground plane the land relief is drawn on. `y` is the deck's height
// above that surface, so every deck and pier is anchored to the water: without
// this, the floating spans hovered ~0.06 above the lake and the high spans'
// legs stopped short of it — invisible at drift distance, plainly wrong (a
// deck floating over open water, trestles reaching nothing) when you zoom in.
const WATER_Y = CONFIG.basemap.waterY;

/** A low inked bridge deck spanning A→B across the water. The floating bridges
 *  ride the surface (y≈0 above the water, no piers); the high spans lift their
 *  deck and drop a few legs to the water so they read as trestles, not paint
 *  on the sheet. `y` is measured UP from the water surface (WATER_Y). */
function bridge(
  latA: number,
  lngA: number,
  latB: number,
  lngB: number,
  w: number,
  y: number,
  piers = 0
) {
  const a = projectLatLng(latA, lngA);
  const b = projectLatLng(latB, lngB);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  const yaw = Math.atan2(dz, dx);
  const deckY = WATER_Y + y; // the deck rides `y` above the water, not the ground
  const segs: THREE.BufferGeometry[] = [];
  const deck = new THREE.BoxGeometry(len, 0.02, w); // built along +x from the origin
  deck.translate(len / 2, deckY, 0);
  segs.push(deck);
  for (let i = 0; i < piers; i++) {
    const t = (i + 1) / (piers + 1);
    // Each leg drops from the deck all the way down to the water surface.
    const legH = deckY - WATER_Y;
    const leg = new THREE.BoxGeometry(w * 0.5, legH, w * 0.5);
    leg.translate(len * t, WATER_Y + legH / 2, 0);
    segs.push(leg);
  }
  const geo = mergeGeometries(segs, false)!;
  segs.forEach((g) => g.dispose());
  geo.rotateY(-yaw); // aim the +x deck along the A→B heading in world XZ
  geo.translate(a.x, 0, a.z);
  return geo;
}

function buildGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // --- downtown massing (heights ~5-6x real, footprints widened past
  //     real proportions — a building's footprint faces the camera
  //     edge-on from most drift angles, so it needs to be a fatter
  //     target than a real floor plate to survive ~20-47 m/px sampling) ---
  parts.push(tower(47.6045, -122.3305, 0.36, 1.5, 0.36)); // Columbia Center
  parts.push(tower(47.6106, -122.3348, 0.28, 1.3, 0.28)); // Rainier Square
  parts.push(tower(47.6082, -122.3369, 0.3, 1.18, 0.3)); // 1201 Third
  parts.push(tower(47.6103, -122.332, 0.26, 1.1, 0.26)); // Two Union Sq
  parts.push(tower(47.6067, -122.3327, 0.26, 1.02, 0.26)); // F5 Tower
  parts.push(tower(47.6046, -122.3294, 0.24, 0.96, 0.24)); // Municipal Tower
  parts.push(tower(47.6019, -122.3318, 0.16, 0.72, 0.16)); // Smith Tower
  parts.push(tower(47.6128, -122.3382, 0.28, 0.78, 0.28)); // Westin-ish
  parts.push(tower(47.6089, -122.3298, 0.24, 0.68, 0.24)); // mid-rise fill
  parts.push(tower(47.6141, -122.3345, 0.24, 0.6, 0.24)); // Denny Triangle fill

  // --- Space Needle: tapered shaft, saucer, spire — radii nearly doubled
  //     from a first pass that was true-toy-scale but read as a hairline
  //     at drift distance; this is the piece's single named landmark, it
  //     has to survive being small on screen ---
  {
    const { x, z } = projectLatLng(47.6205, -122.3493);
    const shaft = new THREE.CylinderGeometry(0.05, 0.09, 0.75, 8);
    shaft.translate(x, 0.375, z);
    const saucer = new THREE.CylinderGeometry(0.17, 0.26, 0.12, 10);
    saucer.translate(x, 0.79, z);
    const spire = new THREE.ConeGeometry(0.024, 0.22, 6);
    spire.translate(x, 0.96, z);
    parts.push(shaft, saucer, spire);
  }

  // --- Seattle Center around the Needle: Climate Pledge's low sweep ---
  parts.push(tower(47.6221, -122.3541, 0.26, 0.1, 0.2));

  // --- Amazon Spheres: three little glass domes tucked into Denny Triangle ---
  {
    const { x, z } = projectLatLng(47.6156, -122.3389);
    for (const [dx, r] of [
      [-0.09, 0.05],
      [0, 0.065],
      [0.09, 0.05],
    ] as const) {
      const s = new THREE.SphereGeometry(r, 10, 8);
      s.translate(x + dx, r * 0.75, z); // sunk slightly — domes, not balloons
      parts.push(s);
    }
  }

  // --- the Great Wheel on Pier 57: A-frame legs only — nearly doubled from a
  //     first pass that was true-toy-scale but read as a hairline at drift
  //     distance, the same fix the Needle needed. The hoop itself is NOT
  //     merged here: it spins, so it's its own mesh (see GreatWheel() below),
  //     while these static legs stay part of the merged landmark geometry. ---
  {
    const { x, z } = projectLatLng(WHEEL_LAT, WHEEL_LNG);
    for (const side of [-1, 1]) {
      const leg = new THREE.BoxGeometry(0.035, 0.3, 0.035);
      leg.rotateX(side * 0.38);
      leg.translate(x, 0.14, z + side * 0.06);
      parts.push(leg);
    }
  }

  // --- SODO stadiums: the two arched bowls beside the tracks. Lumen Field
  //     wears its twin roof canopies over the long stands; T-Mobile Park its
  //     single great retractable-roof arch, the tallest ridge in SODO. Their
  //     spans align with the SODO grid's slight tilt off true north. ---
  //     Footprints pulled back in from the first pass: the two bowls sit only
  //     ~0.42 km apart, so the old widths merged them into one brown blob and
  //     their roofs read as nothing. Tighter ovals + thicker, taller arches
  //     read as two DISTINCT stadiums with clear crowns, and a keep-out in
  //     Buildings.tsx now clears the town fabric off both.
  parts.push(
    stadium(47.5952, -122.3316, 0.26, 0.36, 0.12, Math.PI / 2 + 0.12, [
      { R: 0.17, tube: 0.05, off: 0.075 },
      { R: 0.17, tube: 0.05, off: -0.075 },
    ]),
  ); // Lumen Field — twin canopies over the two long stands
  parts.push(
    stadium(47.5914, -122.3325, 0.3, 0.3, 0.11, 0.12, [
      { R: 0.2, tube: 0.06, off: 0 },
    ]),
  ); // T-Mobile Park — the single great retractable-roof arch, tallest in SODO

  // --- the working waterfront: gantry cranes ranked along the East
  //     Waterway, booms raked over the water — Terminal 18 faces east,
  //     Terminal 46 answers facing west ---
  parts.push(crane(47.577, -122.3455, 0));
  parts.push(crane(47.5805, -122.3452, 0));
  parts.push(crane(47.584, -122.3449, 0));
  parts.push(crane(47.5875, -122.3446, 0));
  parts.push(crane(47.589, -122.3402, Math.PI));
  parts.push(crane(47.5912, -122.3398, Math.PI));

  // --- UW: a slim collegiate tower and two low halls by the station ---
  parts.push(tower(47.6545, -122.3095, 0.09, 0.5, 0.09)); // Gerberding tower
  parts.push(tower(47.6553, -122.308, 0.28, 0.2, 0.14, 0.5)); // halls
  parts.push(tower(47.6537, -122.3078, 0.22, 0.16, 0.12, -0.4));
  parts.push(tower(47.6503, -122.3018, 0.44, 0.13, 0.26, 0.1)); // Husky Stadium

  // --- Gas Works: the rusted drums on their Lake Union point ---
  {
    const drums: [number, number, number, number][] = [
      [47.645, -122.3352, 0.05, 0.2],
      [47.6444, -122.3341, 0.045, 0.26],
      [47.6453, -122.3335, 0.04, 0.17],
    ];
    for (const [lat, lng, r, h] of drums) {
      const { x, z } = projectLatLng(lat, lng);
      const c = new THREE.CylinderGeometry(r, r, h, 9);
      c.translate(x, h / 2, z);
      parts.push(c);
    }
  }

  // --- Bellevue: the 2 Line's second skyline across the lake ---
  parts.push(tower(47.617, -122.2015, 0.26, 0.85, 0.26)); // Lincoln Square N
  parts.push(tower(47.6153, -122.2025, 0.24, 0.78, 0.24)); // Lincoln Square S
  parts.push(tower(47.6155, -122.1953, 0.26, 0.9, 0.26)); // Bellevue 600
  parts.push(tower(47.6139, -122.1988, 0.22, 0.68, 0.22)); // Bellevue Towers
  parts.push(tower(47.612, -122.1966, 0.22, 0.6, 0.22)); // Symetra-ish
  parts.push(tower(47.6178, -122.1968, 0.2, 0.52, 0.2)); // NE 8th fill
  parts.push(tower(47.6133, -122.1935, 0.2, 0.46, 0.2)); // fill by the station

  // --- neighborhood haunts strung along the line: the small places that make
  //     a commute personal, each dropped at its real address and toy-scaled
  //     like everything else so it still reads on the paper ---
  // Kraken Community Iceplex — the Kraken's three-rink practice house and
  //   headquarters beside Northgate Station, on the old mall's lots
  //   (10601 5th Ave NE).
  parts.push(iceplex(47.70611, -122.32528));
  // Bellevue Brewing — the Spring District brewpub off the 2 Line
  //   (12190 NE District Way).
  parts.push(brewery(47.6241, -122.1777, 0.12, 0.09, 0.1, 0.2));
  // Capitol Hill trio, strung south down Broadway / the Pike–Pine corridor:
  //   Stoup Brewing's beer hall at Broadway & Union (1158 Broadway) …
  parts.push(brewery(47.61347, -122.32072, 0.1, 0.08, 0.085, -0.35));
  //   Annapurna Cafe, the Himalayan basement a block below the station
  //   (1833 Broadway) …
  parts.push(tower(47.61855, -122.32104, 0.07, 0.055, 0.06));
  //   … and Life on Mars, the plant-based bar at Pike & Harvard (722 E Pike).
  parts.push(tower(47.61423, -122.31958, 0.07, 0.07, 0.055, 0.3));

  // --- SeaTac: the paired runways (flat inked strokes), control tower, and
  //     the long main terminal with its two satellite concourses east of the
  //     aprons — the airport reads as a place, not just its strips ---
  parts.push(tower(47.44, -122.3116, 0.06, 0.012, 3.0)); // 16L/34R
  parts.push(tower(47.44, -122.3054, 0.06, 0.012, 3.0)); // 16C/34C
  parts.push(tower(47.4416, -122.3116, 0.05, 0.3, 0.05)); // tower
  parts.push(tower(47.44384, -122.30173, 0.16, 0.2, 0.52)); // main terminal (N-S)
  parts.push(tower(47.4455, -122.3089, 0.11, 0.14, 0.17)); // north satellite
  parts.push(tower(47.4404, -122.3089, 0.11, 0.14, 0.17)); // south satellite

  // --- the region's big malls: long low retail slabs, wide-footprint blocks
  //     that anchor their suburbs like the stadiums anchor SODO ---
  // Alderwood Mall, up in Lynnwood beyond the north terminus (3000 184th St SW)
  parts.push(tower(47.82966, -122.27283, 0.5, 0.13, 0.36, 0.15));
  // Westfield Southcenter, the Tukwila mall east of the airport
  //   (2800 Southcenter Pkwy)
  parts.push(tower(47.45888, -122.25818, 0.56, 0.13, 0.44, -0.1));

  // --- the I-5 corridor south of SeaTac: in real life this is NOT open
  //     country between two skylines — the freeway runs through unbroken
  //     built-up land all the way to Tacoma. First pass placed these at
  //     town CENTROIDS (downtown Kent, downtown Auburn), which sit several
  //     km east of the actual freeway — off the ribbon, reading as
  //     scattered blobs rather than a corridor. Re-anchored to hug the real
  //     I-5 alignment itself (the S 200th/Southcenter interchange, the Kent
  //     valley crossing near S 212th, the Federal Way stretch matching
  //     TacomaRoads.tsx's I5_TACOMA polyline, and Fife/Milton where I-5
  //     closes in on Commencement Bay), same massing language as
  //     Southcenter. Generic-pigment, no landmark flags. ---
  parts.push(tower(47.4649, -122.263, 0.22, 0.08, 0.16, 0.2)); // Tukwila, flanking I-5 at Southcenter
  parts.push(tower(47.4598, -122.2685, 0.18, 0.07, 0.14, -0.15));
  parts.push(tower(47.3846, -122.2652, 0.24, 0.09, 0.18, 0.1)); // Kent valley, I-5 at S 212th
  parts.push(tower(47.3781, -122.2668, 0.2, 0.08, 0.16, -0.2));
  parts.push(tower(47.3492, -122.2842, 0.2, 0.08, 0.16, 0.05)); // I-5 approaching Federal Way
  parts.push(tower(47.322, -122.3005, 0.26, 0.1, 0.2, 0.05)); // Federal Way, straddling I5_TACOMA's start
  parts.push(tower(47.28, -122.328, 0.22, 0.08, 0.17, -0.1)); // Fife/Milton, I5_TACOMA's midpoint
  parts.push(tower(47.267, -122.352, 0.18, 0.07, 0.14, 0.25)); // Fife, I-5 closing on the Dome

  // --- the Tacoma Dome, ~45 km south-southwest: the great white timber dome
  //     ghosted on the far horizon PAST Rainier's flank — the 1/2 Line don't
  //     reach it, but the little T Line streetcar does (map/TacomaLink.tsx runs
  //     the real Tacoma Link past its door), a low pale bubble on the rust-red
  //     concourse over the accurately-built city below. Its own hemisphere cap sits on
  //     a short drum, scaled up from true-toy so it survives at drift distance
  //     the way the Needle and Wheel did. Carries its OWN `aTacoma` vertex flag
  //     (set below) so the shader can paint its real colours — pale timber roof,
  //     rust-red concourse — instead of the generic landmark pigment, plus a
  //     faint sumi rim so the white dome reads as drawn against the pale sky.
  //     Distinct from Rainier's Fuji flag: no dawn vermilion, no snow-veins. ---
  const tacoma = (() => {
    const { x, z } = projectLatLng(47.2364, -122.4241);
    const dParts: THREE.BufferGeometry[] = [];
    const drum = new THREE.CylinderGeometry(1.15, 1.22, 0.18, 16);
    drum.translate(x, 0.09, z);
    // A shallow hemisphere — the dome is far wider than it is tall, a saucer
    // not a ball, so we squash the cap to ~0.42 its radius in height.
    const cap = new THREE.SphereGeometry(1.22, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2);
    cap.scale(1, 0.42, 1);
    cap.translate(x, 0.18, z);
    dParts.push(drum, cap);
    const g = mergeGeometries(dParts, false)!;
    dParts.forEach((p) => p.dispose());
    return g;
  })();
  parts.push(tacoma);

  // --- downtown Tacoma, built to the real map so the T Line has a true city to
  //     run through. Everything below is placed at its actual lat/lng via
  //     projectLatLng, so the relative geography reads correctly at drift
  //     distance: the Foss Waterway and Museum of Glass on the SE waterfront,
  //     the Pacific Ave / Commerce St spine of downtown climbing NW, the
  //     Theater District and Old City Hall above it, Stadium High on its bluff
  //     over Commencement Bay to the N, and the Hilltop ridge to the W. The
  //     downtown grid is rotated ~45° off cardinal (avenues run NW–SE along the
  //     waterway), so block long-axes take the shared grid bearing G below.
  //     All generic-pigment, no landmark flags — horizon detailing, not a
  //     focus; the accuracy is in the placement, not the polygon count. ---
  const G = -0.66; // downtown Tacoma's street-grid bearing (avenues NW–SE)

  // Every building/conifer coordinate below is run through spreadTacoma,
  // which dilates the cluster outward from a point on the T Line corridor —
  // the real relative geography, gently pulled apart so the track has
  // visible clearance instead of grazing every footprint (the T Line
  // waypoints in TacomaLink.tsx are left at their true coordinates, so this
  // only ever widens the gap around them). towerS/coniferS/atS are thin
  // wrappers so the call sites below still read as plain lat/lng.
  const atS = (lat: number, lng: number) => {
    const [sLat, sLng] = spreadTacoma(lat, lng);
    return projectLatLng(sLat, sLng);
  };
  const towerS = (lat: number, lng: number, w: number, h: number, d: number, yaw = 0) => {
    const [sLat, sLng] = spreadTacoma(lat, lng);
    return tower(sLat, sLng, w, h, d, yaw);
  };
  const coniferS = (lat: number, lng: number, h: number, spread = 0) => {
    const [sLat, sLng] = spreadTacoma(lat, lng);
    return conifer(sLat, sLng, h, spread);
  };

  // The Museum of Glass on the west bank of the Thea Foss Waterway: its
  // landmark is the 90-ft tilted steel cone over the hot shop. A truncated cone
  // (wide base, narrow open top) raked toward the water, the real silhouette.
  {
    const { x, z } = atS(47.2427, -122.4331);
    const cone = new THREE.CylinderGeometry(0.16, 0.34, 0.62, 16, 1, true);
    cone.rotateZ(0.32); // the museum's signature lean
    cone.translate(x, 0.3, z);
    parts.push(cone);
    // the low gallery slab the cone rises from
    parts.push(towerS(47.2431, -122.4336, 0.26, 0.12, 0.4, G));
  }
  // The Chihuly Bridge of Glass: a thin pedestrian span crossing I-705 from the
  // museum up to Union Station / Pacific Ave — a low deck on two slim pylons.
  parts.push(towerS(47.2435, -122.4344, 0.02, 0.12, 0.02));       // pylon
  parts.push(towerS(47.244, -122.4354, 0.02, 0.12, 0.02));        // pylon
  parts.push(towerS(47.24375, -122.4349, 0.13, 0.02, 0.05, G));   // the span deck

  // Union Station's copper rotunda (1717 Pacific Ave): a domed hall — a short
  // drum under a hemisphere, the one downtown dome a local reads instantly.
  {
    const { x, z } = atS(47.2448, -122.4366);
    const hall = new THREE.BoxGeometry(0.22, 0.16, 0.3);
    hall.rotateY(G);
    hall.translate(x, 0.08, z);
    const drum = new THREE.CylinderGeometry(0.09, 0.1, 0.06, 14);
    drum.translate(x, 0.16, z);
    const dome = new THREE.SphereGeometry(0.09, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.translate(x, 0.19, z);
    parts.push(hall, drum, dome);
  }
  // Tacoma Art Museum, next door on Pacific — a low sculpted block.
  parts.push(towerS(47.2453, -122.4373, 0.2, 0.14, 0.22, G));

  // The downtown high-rise core along Pacific Ave / Broadway (S 11th–S 15th):
  // the real cluster — Tacoma Financial Center the tallest, with the Wells
  // Fargo / Washington / Rust buildings stepping down around it.
  parts.push(towerS(47.2512, -122.4389, 0.24, 0.86, 0.24, G));    // Tacoma Financial Center (tallest)
  parts.push(towerS(47.2502, -122.4379, 0.26, 0.66, 0.26, G));    // Wells Fargo Plaza
  parts.push(towerS(47.2491, -122.4372, 0.24, 0.5, 0.24, G));     // Washington Building
  parts.push(towerS(47.2482, -122.4365, 0.28, 0.4, 0.24, G));     // an older mid-rise core
  parts.push(towerS(47.2472, -122.4382, 0.3, 0.34, 0.26, G));     // a broad block toward Commerce

  // The Greater Tacoma Convention Center (1500 Broadway): a wide low slab.
  parts.push(towerS(47.2466, -122.4381, 0.42, 0.2, 0.34, G));

  // UW Tacoma's brick warehouse campus, SW down Pacific/Jefferson (S 17th–21st):
  // a run of low restored-warehouse blocks.
  parts.push(towerS(47.2456, -122.4384, 0.34, 0.16, 0.22, G));
  parts.push(towerS(47.2447, -122.4389, 0.3, 0.15, 0.2, G));
  parts.push(towerS(47.2439, -122.4396, 0.3, 0.14, 0.2, G));

  // The Theater District — the Pantages/Rialto on Broadway at S 9th: a boxy
  // flytower-topped playhouse.
  parts.push(towerS(47.2506, -122.44, 0.22, 0.3, 0.22, G));
  parts.push(towerS(47.2508, -122.4402, 0.08, 0.42, 0.08, G));    // the stagehouse rising above

  // Old City Hall (625 Commerce St): the Italianate landmark with its tall
  // bell/clock tower on the corner above the waterway.
  parts.push(towerS(47.2519, -122.4406, 0.2, 0.26, 0.2, G));
  parts.push(towerS(47.2521, -122.4408, 0.06, 0.5, 0.06, G));     // the campanile / clock tower

  // Stadium High School and the Stadium Bowl on the bluff to the N, looking out
  // over Commencement Bay: the château-roofed castle and its sunken stadium.
  parts.push(towerS(47.2607, -122.4497, 0.28, 0.34, 0.2, G));     // the castle block
  parts.push(towerS(47.2612, -122.449, 0.04, 0.16, 0.04, G));     // a corner turret
  {
    // the Bowl: a shallow open dish just below the school toward the water
    const { x, z } = atS(47.2615, -122.4485);
    const bowl = new THREE.CylinderGeometry(0.24, 0.18, 0.06, 14, 1, true);
    bowl.translate(x, 0.03, z);
    parts.push(bowl);
  }

  // The Stadium District's own little node up Tacoma Ave (near the T Line's
  // Stadium District stop) and the Hilltop mid-rises along MLK Jr Way.
  parts.push(towerS(47.2569, -122.4435, 0.24, 0.22, 0.24, G));    // Stadium District blocks
  parts.push(towerS(47.2555, -122.4488, 0.3, 0.3, 0.24, G));      // Tacoma General Hospital (MLK)
  parts.push(towerS(47.2511, -122.449, 0.26, 0.24, 0.24, G));     // Hilltop along MLK
  parts.push(towerS(47.2489, -122.4488, 0.24, 0.26, 0.22, G));    // St Joseph Medical Center

  // The evergreen skirt: the ridge climbing W of downtown into Hilltop, and a
  // few conifers on the bluff by the school — the forest every Sound town wears.
  parts.push(coniferS(47.2532, -122.4525, 0.62, 0.02));
  parts.push(coniferS(47.2515, -122.4538, 0.5, -0.03));
  parts.push(coniferS(47.2498, -122.4522, 0.66, 0.01));
  parts.push(coniferS(47.248, -122.4535, 0.54, 0.04));
  parts.push(coniferS(47.2551, -122.4526, 0.58, -0.02));
  parts.push(coniferS(47.2585, -122.4468, 0.6, 0.03));           // the bluff by Stadium High
  parts.push(coniferS(47.2624, -122.4512, 0.52, -0.01));
  parts.push(coniferS(47.2466, -122.4514, 0.48, 0.02));

  // --- Mount Rainier, ~85 km southeast: the print's Fuji. Nudged a touch
  //     taller so its snow cap climbs clear of the mist bands and reads as a
  //     hero on the horizon. The mythic paint (Red Fuji dawn glow, radiating
  //     snow-veins, sumi keyline) rides on the `aRainier` vertex flag set
  //     below, so it lands on THIS cone alone — the Olympics stay atmospheric.
  const rainier = (() => {
    const { x, z } = projectLatLng(46.8523, -121.7603);
    const cone = new THREE.ConeGeometry(9.4, 5.0, 9);
    cone.translate(x, 2.5, z);
    return cone;
  })();
  parts.push(rainier);

  // --- the Olympics, ~60 km west across the Sound: Rainier's answer on the
  //     opposite horizon — a jagged ridge, half-dissolved in fog, snowline
  //     catching the taller summits. Real scale, like Rainier. ---
  parts.push(peak(47.7743, -123.1372, 4.0, 2.4)); // Mount Constance
  parts.push(peak(47.7167, -123.3283, 4.4, 2.35)); // Mount Anderson, deeper in
  parts.push(peak(47.6539, -123.1382, 3.6, 2.2)); // The Brothers
  parts.push(peak(47.8358, -123.0864, 3.4, 2.0)); // Buckhorn ridge, north end
  parts.push(peak(47.5217, -123.2372, 3.2, 1.9)); // Washington/Ellinor massif

  // --- Mount Baker, ~150 km north: a second Fuji on the northern horizon.
  //     Wears the bold Hokusai cap and the sumi keyline (the aBaker flag set
  //     below drives the paint), but stays a COOL distant cone — none of
  //     Rainier's dawn vermilion. Real scale, like Rainier and the Olympics.
  const baker = (() => {
    const { x, z } = projectLatLng(48.7767, -121.8144);
    const cone = new THREE.ConeGeometry(7.0, 4.2, 9);
    cone.translate(x, 2.1, z);
    return cone;
  })();
  parts.push(baker);

  // --- the Cascade wall on the eastern horizon: Glacier Peak's snowfield to
  //     the northeast and a ridge of crest summits due east behind Bellevue —
  //     the range that closes the third side of the mountain frame (Rainier
  //     southeast, the Olympics west). Atmospheric like the Olympics: the
  //     smooth Hokusai snowline, half-dissolved in the far mist. ---
  parts.push(peak(48.1118, -121.1132, 4.0, 2.3)); // Glacier Peak
  parts.push(peak(47.8021, -121.113, 3.2, 1.7)); // Mount Index, crest north
  parts.push(peak(47.4751, -120.9029, 3.6, 1.9)); // Mount Stuart, far east
  parts.push(peak(47.531, -121.42, 2.6, 1.2)); // Snoqualmie crest
  parts.push(peak(47.4879, -121.7223, 1.8, 0.8)); // Mount Si, the near wall

  // --- the city of bridges: the floating spans the trains and highways ride
  //     across Lake Washington, and the ship-canal drawbridges that stitch the
  //     water thread from the lake out to the Sound. Inked decks like the
  //     landmarks; the floating pair rides the water, the high spans sit on
  //     piers. ---
  // I-90 — the 2 Line's OWN crossing: Seattle → Mercer Island (the Lacey V.
  //   Murrow / Homer Hadley floating bridge), then the East Channel span to
  //   Bellevue.
  parts.push(bridge(47.5903, -122.2905, 47.5912, -122.2566, 0.08, 0.03));
  parts.push(bridge(47.5873, -122.2385, 47.5866, -122.2098, 0.07, 0.1, 2));
  // SR-520 — one of the longest floating bridges on earth, Montlake → Medina.
  parts.push(bridge(47.6427, -122.2758, 47.63, -122.2085, 0.08, 0.03));
  // Ship-canal spans, each a raised inked deck on piers.
  parts.push(bridge(47.6452, -122.3477, 47.6512, -122.3472, 0.05, 0.12, 2)); // Aurora (Hwy 99)
  parts.push(bridge(47.6468, -122.3497, 47.65, -122.3496, 0.04, 0.08, 1)); // Fremont
  parts.push(bridge(47.6556, -122.3762, 47.6624, -122.376, 0.05, 0.1, 2)); // Ballard
  parts.push(bridge(47.6518, -122.3202, 47.6557, -122.32, 0.04, 0.09, 1)); // University
  parts.push(bridge(47.6446, -122.3045, 47.648, -122.3044, 0.04, 0.08, 1)); // Montlake
  // West Seattle high bridge over the Duwamish.
  parts.push(bridge(47.5717, -122.333, 47.5726, -122.3545, 0.06, 0.12, 2));

  // --- Hiram M. Chittenden (Ballard) Locks: where the ship canal steps down to
  //     the Sound — the lock-chamber walls inked across the cut, with the little
  //     administration building on the south bank ---
  {
    const { x, z } = projectLatLng(47.6657, -122.3966);
    const wallA = new THREE.BoxGeometry(0.12, 0.03, 0.018);
    wallA.translate(x, 0.015, z - 0.03);
    const wallB = new THREE.BoxGeometry(0.12, 0.03, 0.018);
    wallB.translate(x, 0.015, z);
    const wallC = new THREE.BoxGeometry(0.16, 0.03, 0.018);
    wallC.translate(x + 0.02, 0.015, z + 0.04);
    const house = new THREE.BoxGeometry(0.05, 0.06, 0.05);
    house.translate(x - 0.055, 0.03, z + 0.07);
    parts.push(wallA, wallB, wallC, house);
  }

  // --- the far shores across the Sound: Bainbridge, Vashon and little Blake
  //     Island — ghosted forested ridges the ferries actually sail to, half
  //     dissolved in the marine haze like the Olympics beyond. Low and wide
  //     (no snowline), so they read as LAND massing, not peaks. ---
  parts.push(peak(47.653, -122.525, 2.2, 0.7)); // Bainbridge, north ridge
  parts.push(peak(47.62, -122.53, 2.0, 0.6)); // Bainbridge, south
  parts.push(peak(47.415, -122.46, 2.6, 0.7)); // Vashon Island spine
  parts.push(peak(47.38, -122.47, 2.2, 0.6)); // Vashon, south
  parts.push(peak(47.54, -122.488, 0.9, 0.4)); // Blake Island

  // --- Pike Place Market: the long market arcade stepping down the waterfront
  //     bluff, with the clock-and-sign pylon at its north end ---
  parts.push(tower(47.6097, -122.3421, 0.1, 0.09, 0.26, 0.35)); // the arcade (long axis along the bluff)
  parts.push(tower(47.6101, -122.3419, 0.05, 0.16, 0.04, 0.35)); // the neon sign / clock pylon

  // --- Boeing Field / King County International (KBFI): the region's SECOND
  //     airfield, south of downtown — its runways inked like SeaTac's strips,
  //     a control tower, and the Museum of Flight's great glass gallery on the
  //     west apron ---
  parts.push(tower(47.53, -122.302, 0.05, 0.01, 2.0)); // main runway 14R/32L (N–S)
  parts.push(tower(47.53, -122.3055, 0.035, 0.01, 1.4)); // 14L/32R
  parts.push(tower(47.5322, -122.301, 0.04, 0.16, 0.04)); // control tower
  parts.push(tower(47.5178, -122.2966, 0.16, 0.1, 0.16, 0.1)); // Museum of Flight

  // Tag every vertex with whether it belongs to Rainier (1), Baker (1 on its
  // own flag), or neither. A flag must exist on ALL parts or mergeGeometries
  // refuses the merge; the fragment shader keys the mythic paint off each so
  // nothing else is touched.
  for (const g of parts) {
    const n = g.attributes.position.count;
    g.setAttribute(
      "aRainier",
      new THREE.BufferAttribute(new Float32Array(n).fill(g === rainier ? 1 : 0), 1)
    );
    g.setAttribute(
      "aBaker",
      new THREE.BufferAttribute(new Float32Array(n).fill(g === baker ? 1 : 0), 1)
    );
    g.setAttribute(
      "aTacoma",
      new THREE.BufferAttribute(new Float32Array(n).fill(g === tacoma ? 1 : 0), 1)
    );
  }

  const merged = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  return merged;
}

// The sun phase is a single 0..1 blend (night..day) with no dawn/dusk sign,
// so we recover the direction (rising → Red Fuji vermilion, falling → dusk
// plum) from the sun's TRAJECTORY, not from frame velocity — the real sun
// crawls far too slowly to register frame-to-frame. Live: sample the honest
// sun 10 min ahead. Override (observe sweep / ?phase=): the swept value moves
// fast, so a smoothed velocity works, and a pinned-static phase defaults to
// the hero Red Fuji. Shared by Landmarks() and GreatWheel() — both paint with
// the same Rainier-flag shader and need the same dawn/dusk envelope.
function dawnDuskEnv(
  phaseRef: { current: number },
  velRef: { current: number }
): { dawn: number; dusk: number } {
  const phase = sunPhase();
  let dir: number;
  if (getPhaseOverride() == null) {
    const ahead = sunPhaseAt(new Date(Date.now() + 10 * 60 * 1000));
    dir = ahead > phase + 1e-4 ? 1 : ahead < phase - 1e-4 ? -1 : 0;
  } else {
    const dp = phase - phaseRef.current;
    velRef.current = velRef.current * 0.9 + (Math.abs(dp) > 1e-5 ? Math.sign(dp) : 0) * 0.1;
    dir = Math.abs(velRef.current) < 0.05 ? 1 : Math.sign(velRef.current);
  }
  phaseRef.current = phase;

  // The glow lives in the twilight band and falls to a pale ghost at noon.
  const env = ss(0.06, 0.4, phase) * (1 - ss(0.5, 0.9, phase));
  return { dawn: env * Math.max(0, dir), dusk: env * Math.max(0, -dir) };
}

export function Landmarks() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(buildGeometry, []);
  const rainierAxis = useMemo(() => {
    const { x, z } = projectLatLng(46.8523, -121.7603);
    return new THREE.Vector2(x, z);
  }, []);
  const phaseRef = useRef(sunPhase());
  const velRef = useRef(0);

  useFrame(() => {
    const m = materialRef.current;
    if (!m) return;
    m.uniforms.uOpacity.value = LIVE.landmarkOpacity;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;
    const { dawn, dusk } = dawnDuskEnv(phaseRef, velRef);
    m.uniforms.uDawn.value = dawn;
    m.uniforms.uDusk.value = dusk;
  });

  return (
    <mesh geometry={geometry} renderOrder={6} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uColor: { value: LIVE.landmark }, // palette-by-reference
          uOpacity: { value: LIVE.landmarkOpacity },
          uFog: { value: LIVE.fog },
          uFogDensity: { value: LIVE.fogDensity },
          uRainierAxis: { value: rainierAxis },
          uDawn: { value: 0 },
          uDusk: { value: 0 },
        }}
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

/** The Great Wheel's hoop, centered at the local origin so the mesh itself
 *  can spin — everything else in Landmarks.tsx is baked into one static
 *  merged geometry, but this one landmark is always turning. */
function buildWheelGeometry(): THREE.BufferGeometry {
  const geo = new THREE.TorusGeometry(WHEEL_R, 0.03, 7, 24);
  const n = geo.attributes.position.count;
  geo.setAttribute("aRainier", new THREE.BufferAttribute(new Float32Array(n), 1));
  geo.setAttribute("aBaker", new THREE.BufferAttribute(new Float32Array(n), 1));
  geo.setAttribute("aTacoma", new THREE.BufferAttribute(new Float32Array(n), 1));
  return geo;
}

/** The Great Wheel's hoop — same watercolor shader and dawn/dusk paint as
 *  every other landmark, but its own mesh so it can rotate independently. A
 *  stately, always-on spin (WHEEL_SPIN_PERIOD_S), matched by its rim lights
 *  in map/CityLights.tsx. Rendered as a sibling of <Landmarks/> in App.tsx;
 *  its static A-frame legs stay in the main merged geometry above. */
export function GreatWheel() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(buildWheelGeometry, []);
  const hub = useMemo(() => {
    const { x, z } = projectLatLng(WHEEL_LAT, WHEEL_LNG);
    return new THREE.Vector3(x, WHEEL_HUB_Y, z);
  }, []);
  // The wheel never carries the Rainier/Baker mythic paint (aRainier/aBaker
  // are always 0), so the axis uniform is inert — a placeholder to satisfy
  // the shared shader.
  const rainierAxis = useMemo(() => new THREE.Vector2(0, 0), []);
  const phaseRef = useRef(sunPhase());
  const velRef = useRef(0);

  useFrame(() => {
    const m = materialRef.current;
    if (m) {
      m.uniforms.uOpacity.value = LIVE.landmarkOpacity;
      m.uniforms.uFogDensity.value = LIVE.fogDensity;
      const { dawn, dusk } = dawnDuskEnv(phaseRef, velRef);
      m.uniforms.uDawn.value = dawn;
      m.uniforms.uDusk.value = dusk;
    }
    if (meshRef.current) {
      meshRef.current.rotation.z = (CLOCK.t / WHEEL_SPIN_PERIOD_S) * Math.PI * 2;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={hub} renderOrder={6} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uColor: { value: LIVE.landmark },
          uOpacity: { value: LIVE.landmarkOpacity },
          uFog: { value: LIVE.fog },
          uFogDensity: { value: LIVE.fogDensity },
          uRainierAxis: { value: rainierAxis },
          uDawn: { value: 0 },
          uDusk: { value: 0 },
        }}
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}
