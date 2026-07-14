// Hand-inked landmarks: the silhouettes that make the diagram unmistakably
// Seattle — downtown's massed towers, the Space Needle, the SODO stadiums,
// UW's campus and Husky Stadium, SeaTac's runways and terminal, the working
// waterfront's gantry cranes, the Great Wheel, Gas Works' rusted drums, the
// Amazon Spheres, Bellevue's second skyline across the lake for the 2 Line,
// the region's big malls (Alderwood up north, Southcenter down in Tukwila), a
// handful of neighborhood haunts strung along the line (the Kraken's
// Iceplex at Northgate, brewpubs and Broadway cafés), and — ghosted at real
// scale on the horizons — Mount Rainier southeast and the Olympics west.
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
import { LIVE } from "../world/palettes";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  varying float vY;
  varying vec3 vNormal;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vY = world.y;
    vNormal = normal; // geometry is baked in world space; the mesh never moves
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
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    float wash = wcFbm(vWorld * 0.8 + vY * 2.1); // pigment mottle per face
    // A fixed key light from the northwest sky: sunlit and shadowed faces
    // diverge, and flat silhouettes become solid massing.
    vec3 n = normalize(vNormal);
    // Shadowed faces still drink plenty of skylight: the floor sits HIGH so no
    // face sinks into the dark ground, while the lit ceiling holds at 1.0 (the
    // massing keeps its dimension without crossing the bloom line).
    float key = 0.66 + 0.34 * max(0.0, dot(n, normalize(vec3(-0.5, 0.8, -0.45))));
    vec3 c = uColor * key * (0.85 + 0.3 * wash);
    // Watercolor still pools faintly at the base.
    c *= mix(1.08, 0.94, smoothstep(0.0, 0.9, vY));
    // Snowline — only Rainier and the Olympics climb past ~1.4 km. A lower
    // start and a stronger cap make Rainier read as a clear snow-capped hero
    // (Fuji's register) instead of dissolving into the pale sky.
    // Warm white, the way Hokusai capped Fuji — never a cool blue-grey.
    c = mix(c, vec3(0.97, 0.94, 0.88), smoothstep(1.4, 3.4, vY) * 0.93);
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

  // --- the Great Wheel on Pier 57: a hoop over the waterline, A-frame legs ---
  {
    const { x, z } = projectLatLng(47.6061, -122.3426);
    const wheel = new THREE.TorusGeometry(0.11, 0.016, 6, 22);
    wheel.translate(x, 0.15, z); // plane vertical, axle roughly along the pier
    parts.push(wheel);
    for (const side of [-1, 1]) {
      const leg = new THREE.BoxGeometry(0.02, 0.17, 0.02);
      leg.rotateX(side * 0.38);
      leg.translate(x, 0.08, z + side * 0.035);
      parts.push(leg);
    }
  }

  // --- SODO stadiums: two long low halls beside the tracks ---
  parts.push(tower(47.5952, -122.3316, 0.34, 0.2, 0.5)); // Lumen Field
  parts.push(tower(47.5914, -122.3325, 0.42, 0.16, 0.42)); // T-Mobile Park

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

  // --- Mount Rainier, ~85 km southeast: the print's Fuji. Nudged a touch
  //     taller so its snow cap climbs clear of the mist bands and reads as a
  //     hero on the horizon — still a pale presence, not a prop.
  {
    const { x, z } = projectLatLng(46.8523, -121.7603);
    const cone = new THREE.ConeGeometry(9.4, 5.0, 9);
    cone.translate(x, 2.5, z);
    parts.push(cone);
  }

  // --- the Olympics, ~60 km west across the Sound: Rainier's answer on the
  //     opposite horizon — a jagged ridge, half-dissolved in fog, snowline
  //     catching the taller summits. Real scale, like Rainier. ---
  parts.push(peak(47.7743, -123.1372, 4.0, 2.4)); // Mount Constance
  parts.push(peak(47.7167, -123.3283, 4.4, 2.35)); // Mount Anderson, deeper in
  parts.push(peak(47.6539, -123.1382, 3.6, 2.2)); // The Brothers
  parts.push(peak(47.8358, -123.0864, 3.4, 2.0)); // Buckhorn ridge, north end
  parts.push(peak(47.5217, -123.2372, 3.2, 1.9)); // Washington/Ellinor massif

  const merged = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  return merged;
}

export function Landmarks() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(buildGeometry, []);

  useFrame(() => {
    const m = materialRef.current;
    if (!m) return;
    m.uniforms.uOpacity.value = LIVE.landmarkOpacity;
    m.uniforms.uFogDensity.value = LIVE.fogDensity;
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
        }}
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}
