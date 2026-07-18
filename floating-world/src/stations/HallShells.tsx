// The rooms of the underground. The halls used to be a fresco and a few
// figures floating in blank void — diving down framed them against a huge
// empty field of paper. This gives every hall an actual chamber: a warm
// floor wash the fresco and crowd stand ON, and a ring wall around the
// platform, lamplit at its base in the station's identity accent and dying
// upward toward the paper. Both breathe with the honest dwell pulse (the
// same PLATFORM_PULSE signal the orb, crowd and fresco read), and push a
// little harder at night when the sheet overhead dims them.
//
// Two instanced draw calls (floors + walls), submerged at renderOrder 2.9 —
// above the tunnel-trench walls (2.8), under the ribbons/orbs/shafts and
// UndergroundLife's crowd + fresco (3), per the GroundPlane order table.
// Mounts after Stations.tsx (same contract as UndergroundLife) so
// UNDERGROUND_SITES is filled when the pools lay out. Additive light seen
// through the sheet → multiplies by the fog factor. Static matrices; only
// the per-instance pulse attribute moves per frame.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LIVE } from "../world/palettes";
import { CONFIG } from "../world/config";
import { sunPhase } from "../world/sun";
import { useUi } from "../trains/store";
import { UNDERGROUND_SITES, PLATFORM_PULSE } from "./platformPulse";
import { FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "../map/watercolorGlsl";

// The chamber's proportions, relative to the seal radius the fresco and
// crowd already use: the floor reaches past the fresco disc (×2.5) so the
// art sits on ground, and the wall ring stands just beyond the floor's edge.
const FLOOR_RADIUS_K = 3.1;
const WALL_RADIUS_K = 3.3;
const WALL_TOP_Y = -0.04; // stops shy of the paper, like the tunnel trench

const FLOOR_VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aPulse;
  attribute vec3 aAccent;
  varying vec2 vLocal;
  varying float vPulse;
  varying vec3 vAccent;
  void main() {
    vLocal = position.xy; // unit circle → disc coords in [-1, 1]
    vPulse = aPulse;
    vAccent = aAccent;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

// A quiet stone wash — warmest under the platform lamps at the center,
// pooling toward the accent at the rim, soft-edged like everything painted
// on this sheet. Sits well below the fresco's voice.
const FLOOR_FRAG = /* glsl */ `
  ${FOG_VARYINGS_FRAG}
  uniform vec3 uLantern;
  uniform float uNight;
  varying vec2 vLocal;
  varying float vPulse;
  varying vec3 vAccent;
  void main() {
    float r = length(vLocal);
    float body = 1.0 - smoothstep(0.7, 1.0, r);
    if (body < 0.004) discard;
    float core = 1.0 - smoothstep(0.0, 0.75, r);
    vec3 col = mix(vAccent, uLantern, core * 0.55);
    float glow = (0.2 + 0.16 * vPulse) * (1.0 + 0.5 * uNight);
    float fog = 1.0 - fogFactor();
    gl_FragColor = vec4(col * glow * fog, body * glow * fog);
  }
`;

const WALL_VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aPulse;
  attribute vec3 aAccent;
  varying float vY; // -0.5 base → +0.5 top of the unit cylinder
  varying float vPulse;
  varying vec3 vAccent;
  void main() {
    vY = position.y;
    vPulse = aPulse;
    vAccent = aAccent;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

// The ring wall: lamplight pooling at the floor line, thinning to nothing
// before the paper — the hall reads as a lit room with an open ceiling (the
// sheet itself), never a sealed can.
const WALL_FRAG = /* glsl */ `
  ${FOG_VARYINGS_FRAG}
  uniform vec3 uLantern;
  uniform float uNight;
  varying float vY;
  varying float vPulse;
  varying vec3 vAccent;
  void main() {
    float h = vY + 0.5; // 0 at the floor, 1 at the top
    float fade = pow(1.0 - h, 2.0);
    if (fade < 0.004) discard;
    vec3 col = mix(vAccent, uLantern, 0.35);
    float glow = (0.3 + 0.32 * vPulse) * (1.0 + 0.5 * uNight);
    float fog = 1.0 - fogFactor();
    gl_FragColor = vec4(col * glow * fade * fog, fade * glow * fog);
  }
`;

const matrix = new THREE.Matrix4();
const FLAT_QUAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
const POS = new THREE.Vector3();
const SCALE = new THREE.Vector3();
const IDENT_QUAT = new THREE.Quaternion();

export function HallShells() {
  const floorRef = useRef<THREE.InstancedMesh>(null);
  const wallRef = useRef<THREE.InstancedMesh>(null);

  const pools = useMemo(() => {
    const sites = UNDERGROUND_SITES;
    const n = sites.length;
    const accent = new Float32Array(n * 3);
    sites.forEach((s, i) => {
      accent[i * 3] = s.accent.r;
      accent[i * 3 + 1] = s.accent.g;
      accent[i * 3 + 2] = s.accent.b;
    });
    const pulse = new Float32Array(n);

    const floorGeometry = new THREE.CircleGeometry(1, 40);
    const floorPulse = new THREE.InstancedBufferAttribute(pulse.slice(), 1);
    floorPulse.setUsage(THREE.DynamicDrawUsage);
    floorGeometry.setAttribute("aAccent", new THREE.InstancedBufferAttribute(accent, 3));
    floorGeometry.setAttribute("aPulse", floorPulse);

    const wallGeometry = new THREE.CylinderGeometry(1, 1, 1, 36, 1, true);
    const wallPulse = new THREE.InstancedBufferAttribute(pulse.slice(), 1);
    wallPulse.setUsage(THREE.DynamicDrawUsage);
    wallGeometry.setAttribute("aAccent", new THREE.InstancedBufferAttribute(accent.slice(), 3));
    wallGeometry.setAttribute("aPulse", wallPulse);

    return { sites, count: n, floorGeometry, floorPulse, wallGeometry, wallPulse };
  }, []);

  const placed = useRef(false);

  useFrame(() => {
    if (!PLATFORM_PULSE.ready || pools.count === 0) return;
    const fm = floorRef.current;
    const wm = wallRef.current;

    if (!placed.current && (fm || wm)) {
      placed.current = true;
      const floorR = CONFIG.station.sealRadiusKm * FLOOR_RADIUS_K;
      const wallR = CONFIG.station.sealRadiusKm * WALL_RADIUS_K;
      for (let i = 0; i < pools.count; i++) {
        const s = pools.sites[i];
        if (fm) {
          POS.set(s.x, s.y + 0.004, s.z); // under the fresco's 0.01 lift
          SCALE.set(floorR, floorR, floorR);
          matrix.compose(POS, FLAT_QUAT, SCALE);
          fm.setMatrixAt(i, matrix);
        }
        if (wm) {
          const h = WALL_TOP_Y - s.y;
          POS.set(s.x, s.y + h / 2, s.z);
          SCALE.set(wallR, h, wallR);
          matrix.compose(POS, IDENT_QUAT, SCALE);
          wm.setMatrixAt(i, matrix);
        }
      }
      if (fm) fm.instanceMatrix.needsUpdate = true;
      if (wm) wm.instanceMatrix.needsUpdate = true;
    }

    // Descending into a hall turns its room lights up: the dived hall runs at
    // full (over-full) pulse so the chamber reads through the paper while the
    // camera holds over its floor. Lighting the ROOM is scenery, not honesty —
    // the crowd (UndergroundLife) still only gathers for real trains.
    const diveId = useUi.getState().diveStationId;
    const pulses = PLATFORM_PULSE.value;
    for (let i = 0; i < pools.count; i++) {
      const site = pools.sites[i];
      let p = pulses[site.pulseIndex] ?? 0;
      if (site.id === diveId) p = Math.max(p, 1) + 0.9;
      pools.floorPulse.setX(i, p);
      pools.wallPulse.setX(i, p);
    }
    pools.floorPulse.needsUpdate = true;
    pools.wallPulse.needsUpdate = true;

    const night = 1 - sunPhase();
    if (fm) {
      const mat = fm.material as THREE.ShaderMaterial;
      mat.uniforms.uNight.value = night;
      mat.uniforms.uFogDensity.value = LIVE.fogDensity;
    }
    if (wm) {
      const mat = wm.material as THREE.ShaderMaterial;
      mat.uniforms.uNight.value = night;
      mat.uniforms.uFogDensity.value = LIVE.fogDensity;
    }
  });

  if (pools.count === 0) return null;

  return (
    <group>
      <instancedMesh
        ref={floorRef}
        args={[undefined, undefined, pools.count]}
        geometry={pools.floorGeometry}
        renderOrder={2.9}
        frustumCulled={false}
      >
        <shaderMaterial
          vertexShader={FLOOR_VERT}
          fragmentShader={FLOOR_FRAG}
          uniforms={{
            uLantern: { value: new THREE.Color("#ffcf85") }, // the platform-lamp warmth
            uNight: { value: 0 },
            uFog: { value: LIVE.fog }, // palette-by-reference
            uFogDensity: { value: LIVE.fogDensity },
          }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </instancedMesh>

      <instancedMesh
        ref={wallRef}
        args={[undefined, undefined, pools.count]}
        geometry={pools.wallGeometry}
        renderOrder={2.9}
        frustumCulled={false}
      >
        <shaderMaterial
          vertexShader={WALL_VERT}
          fragmentShader={WALL_FRAG}
          uniforms={{
            uLantern: { value: new THREE.Color("#ffcf85") },
            uNight: { value: 0 },
            uFog: { value: LIVE.fog },
            uFogDensity: { value: LIVE.fogDensity },
          }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
    </group>
  );
}
