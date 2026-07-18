// The tunnels get walls. Until now the bored sections were a bare ribbon
// floating in the void under the paper — diving after a train (or into a
// hall) framed a glowing line in a huge empty field of washi. This pairs
// every tunnel segment with two low VERTICAL walls flanking the track — a
// soft lamplit trench in the line's own pigment, brightest at the floor and
// dying out toward the paper overhead, faded at both ends so the portals
// stay open mouths instead of hard cuts.
//
// One merged geometry per line (left + right walls of every tunnel segment
// in one draw call), submerged with the tunnel ribbons (renderOrder 2.8 —
// just UNDER them in the order table) so the trench paints behind the track,
// the orbs, the shafts and the halls. Additive light seen through the sheet,
// so per canon it MULTIPLIES by the fog factor. Deterministic, static
// geometry; only uniforms move per frame.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LINES } from "./network";
import { railHeightAt } from "./grade";
import { buildWallStrip, mergeStrips } from "./ribbon";
import { slicePolyline, densify } from "./LineRibbons";
import { CONFIG } from "../world/config";
import { LIVE, lineGlow } from "../world/palettes";
import { CLOCK } from "../world/clock";
import { sunPhase } from "../world/sun";
import { FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vWorld = position.xz;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

// Lamplight pooling at the trench floor (uv.y 0) and thinning toward the
// paper; the run's ends feather out so the portal reads as a mouth. A slow
// shimmer wanders the length like the ribbons' own breath.
const FRAG = /* glsl */ `
  ${FOG_VARYINGS_FRAG}
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float floorGlow = pow(1.0 - vUv.y, 2.2);
    float ends = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x);
    float shimmer = 0.9 + 0.1 * sin(vUv.x * 55.0 + uTime * 0.22);
    float a = floorGlow * ends * uIntensity;
    gl_FragColor = vec4(uColor * shimmer * (1.0 - fogFactor()), a);
  }
`;

interface WallSpec {
  key: string;
  geometry: THREE.BufferGeometry;
  color: THREE.Color; // private, lerped pigment↔lantern each frame
  pigment: THREE.Color;
  lantern: THREE.Color;
}

// Walls stand a bit clear of the ribbon edge and stop shy of the paper — the
// trench is a room around the track, not a sleeve painted onto it.
const WALL_CLEARANCE_KM = 0.06;
const WALL_TOP_Y = -0.1;
const FLOOR_DROP_KM = 0.02;

/** The after-dark lift, matching LineRibbons' lanternGlow (kept private
 *  there; the trench runs dimmer so a small drift doesn't matter). */
function lantern(pigment: THREE.Color): THREE.Color {
  const c = pigment.clone();
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(1, hsl.s * 0.9 + 0.1), Math.min(0.62, hsl.l + 0.26));
  return c;
}

export function TunnelWalls() {
  const materials = useRef<{ material: THREE.ShaderMaterial; spec: WallSpec }[]>([]);

  const walls = useMemo<WallSpec[]>(() => {
    const specs: WallSpec[] = [];
    const offset = CONFIG.ribbon.widthKm / 2 + WALL_CLEARANCE_KM;
    for (const line of LINES) {
      const dir = line.directions[0];
      if (!dir) continue;
      const strips: THREE.BufferGeometry[] = [];
      for (const grade of dir.grades) {
        if (grade.grade !== "tunnel") continue;
        const pts = densify(slicePolyline(dir, grade.fromKm, grade.toKm), 0.05);
        if (pts.length < 2) continue;
        const xz = pts.map(([x, z]) => [x, z] as [number, number]);
        const ysBottom = pts.map(([, , s]) => railHeightAt(dir, s) - FLOOR_DROP_KM);
        for (const side of [offset, -offset]) {
          strips.push(buildWallStrip(xz, { offsetKm: side, yTop: WALL_TOP_Y, ysBottom }));
        }
      }
      if (strips.length === 0) continue;
      const pigment = lineGlow(line.id, line.color);
      specs.push({
        key: line.id,
        geometry: mergeStrips(strips),
        color: pigment.clone(),
        pigment,
        lantern: lantern(pigment),
      });
    }
    return specs;
  }, []);

  useFrame(() => {
    const phase = sunPhase();
    for (const entry of materials.current) {
      if (!entry) continue;
      entry.spec.color.lerpColors(entry.spec.lantern, entry.spec.pigment, phase);
      // Ride the line-intensity mood at the tunnels' own dimmed register —
      // the trench is scenery under the track's voice, never over it.
      entry.material.uniforms.uIntensity.value =
        LIVE.lineIntensity * CONFIG.ribbon.intensity.tunnel * 0.22;
      entry.material.uniforms.uTime.value = CLOCK.t;
      entry.material.uniforms.uFogDensity.value = LIVE.fogDensity;
    }
  });

  return (
    <group>
      {walls.map((w, i) => (
        <mesh key={w.key} geometry={w.geometry} renderOrder={2.8} frustumCulled={false}>
          <shaderMaterial
            ref={(m: THREE.ShaderMaterial | null) => {
              if (m) materials.current[i] = { material: m, spec: w };
            }}
            vertexShader={VERT}
            fragmentShader={FRAG}
            uniforms={{
              uColor: { value: w.color },
              uIntensity: { value: 0 },
              uTime: { value: 0 },
              uFog: { value: LIVE.fog },
              uFogDensity: { value: LIVE.fogDensity },
            }}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
