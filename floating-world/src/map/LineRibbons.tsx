// The lines themselves: flat triangle-strip ribbons, printed rather than
// lit — NORMAL-blended pigment (additive filaments wash out to pastel on
// bright washi). By day each line is its woodblock pigment (the lineGlow
// clamp); after dark the same stroke lightens toward a lantern-lit version
// of itself and reads as a glowing filament on the dark paper, exactly the
// way the gold streets do. One geometry per (line × grade-class); tunnels
// sit below the ground plane at reduced intensity, elevated segments ride
// slightly high and a touch brighter.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LINES, DirectionGeometry } from "./network";
import { railHeightAt } from "./grade";
import { buildStrip } from "./ribbon";
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

// Soft core with a faint wandering shimmer along the length: the line
// itself breathes, even with no train nearby. Normal-blended, so the color
// mixes toward fog per the raw-ShaderMaterial contract and intensity lives
// in alpha.
const FRAG = /* glsl */ `
  ${FOG_VARYINGS_FRAG}
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float across = abs(vUv.y * 2.0 - 1.0);
    float core = smoothstep(1.0, 0.0, across);
    core = pow(core, 1.8);
    float shimmer = 0.92 + 0.08 * sin(vUv.x * 40.0 - uTime * 0.35);
    vec3 c = mix(uColor * shimmer, uFog, fogFactor());
    gl_FragColor = vec4(c, core * uIntensity);
  }
`;

interface RibbonSpec {
  key: string;
  geometry: THREE.BufferGeometry;
  color: THREE.Color; // private, lerped pigment↔lantern each frame
  pigment: THREE.Color;
  lantern: THREE.Color;
  gradeIntensity: number;
  renderOrder: number;
}

/** The after-dark voice of a line: the same hue lifted toward lantern
 *  light, so a normal-blended stroke glows against the night paper. */
function lanternGlow(pigment: THREE.Color): THREE.Color {
  const c = pigment.clone();
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(1, hsl.s * 0.9 + 0.1), Math.min(0.62, hsl.l + 0.26));
  return c;
}

/** Slice a direction's polyline to [fromKm, toKm] with interpolated ends.
 *  Each point carries [x, z, s] — arc length rides along so the height
 *  profile can be evaluated per vertex. */
function slicePolyline(dir: DirectionGeometry, fromKm: number, toKm: number): number[][] {
  const pts: number[][] = [];
  const { points, cumKm } = dir;
  const at = (s: number) => {
    let lo = 0;
    let hi = cumKm.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cumKm[mid] <= s) lo = mid;
      else hi = mid;
    }
    const span = cumKm[lo + 1] - cumKm[lo];
    const t = span > 0 ? (s - cumKm[lo]) / span : 0;
    return [
      points[lo * 2] + (points[(lo + 1) * 2] - points[lo * 2]) * t,
      points[lo * 2 + 1] + (points[(lo + 1) * 2 + 1] - points[lo * 2 + 1]) * t,
      s,
    ];
  };
  pts.push(at(fromKm));
  for (let i = 0; i < cumKm.length; i++) {
    if (cumKm[i] > fromKm && cumKm[i] < toKm) {
      pts.push([points[i * 2], points[i * 2 + 1], cumKm[i]]);
    }
  }
  pts.push(at(toKm));
  return pts;
}

/** Insert points so no segment exceeds maxStepKm — a coarse polyline would
 *  render the ramp as one or two hard kinks; densifying makes it a curve. */
function densify(pts: number[][], maxStepKm: number): number[][] {
  const out: number[][] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const ds = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.floor(ds / maxStepKm);
    for (let k = 1; k <= n; k++) {
      const t = k / (n + 1);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    }
    out.push(b);
  }
  return out;
}

export function LineRibbons() {
  const materials = useRef<{ material: THREE.ShaderMaterial; spec: RibbonSpec }[]>([]);

  const ribbons = useMemo<RibbonSpec[]>(() => {
    const specs: RibbonSpec[] = [];
    for (const line of LINES) {
      const dir = line.directions[0];
      if (!dir) continue;
      for (const [gi, grade] of dir.grades.entries()) {
        // 0.05 km spacing guarantees interior vertices inside even a short,
        // steep ramp band — coarser and the ramp aliases back to a near-step.
        const pts = densify(slicePolyline(dir, grade.fromKm, grade.toKm), 0.05);
        if (pts.length < 2) continue;
        const pigment = lineGlow(line.id, line.color);
        specs.push({
          key: `${line.id}-${gi}-${grade.grade}`,
          geometry: buildStrip(
            pts.map(([x, z]) => [x, z] as [number, number]),
            {
              widthKm: CONFIG.ribbon.widthKm,
              y: CONFIG.ribbon.y[grade.grade],
              ys: pts.map(([, , s]) => railHeightAt(dir, s)),
              normalizeU: true,
            }
          ),
          color: pigment.clone(),
          pigment,
          lantern: lanternGlow(pigment),
          gradeIntensity: CONFIG.ribbon.intensity[grade.grade],
          // Order table lives in GroundPlane.tsx: tunnels under the paper.
          renderOrder: grade.grade === "tunnel" ? 3 : 6,
        });
      }
    }
    return specs;
  }, []);

  useFrame(() => {
    const phase = sunPhase();
    for (const entry of materials.current) {
      if (!entry) continue;
      // Pigment by day, lantern filament by night — the uniform holds the
      // spec's private Color, so lerping it recolors the shader in place.
      entry.spec.color.lerpColors(entry.spec.lantern, entry.spec.pigment, phase);
      entry.material.uniforms.uIntensity.value = LIVE.lineIntensity * entry.spec.gradeIntensity;
      entry.material.uniforms.uTime.value = CLOCK.t;
      entry.material.uniforms.uFogDensity.value = LIVE.fogDensity;
    }
  });

  return (
    <group>
      {ribbons.map((r, i) => (
        <mesh key={r.key} geometry={r.geometry} renderOrder={r.renderOrder} frustumCulled={false}>
          <shaderMaterial
            ref={(m: THREE.ShaderMaterial | null) => {
              if (m) materials.current[i] = { material: m, spec: r };
            }}
            vertexShader={VERT}
            fragmentShader={FRAG}
            uniforms={{
              uColor: { value: r.color },
              uIntensity: { value: 1 },
              uTime: { value: 0 },
              uFog: { value: LIVE.fog },
              uFogDensity: { value: LIVE.fogDensity },
            }}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
