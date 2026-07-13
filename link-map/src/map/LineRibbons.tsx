// The lines themselves: flat triangle-strip ribbons with a soft-edged
// additive core — neon filament, not tube. One geometry per (line ×
// grade-class); tunnels sit below the ground plane at reduced intensity,
// elevated segments ride slightly high and a touch brighter.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LINES, DirectionGeometry } from "./network";
import { CONFIG } from "../world/config";
import { LIVE, lineGlow } from "../world/palettes";
import { CLOCK } from "../world/clock";

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Soft core with a faint wandering shimmer along the length: the line
// itself breathes, even with no train nearby.
const FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float across = abs(vUv.y * 2.0 - 1.0);
    float core = smoothstep(1.0, 0.0, across);
    core = pow(core, 1.8);
    float shimmer = 0.92 + 0.08 * sin(vUv.x * 40.0 - uTime * 0.35);
    vec3 c = uColor * uIntensity * core * shimmer;
    gl_FragColor = vec4(c, core);
  }
`;

interface RibbonSpec {
  key: string;
  geometry: THREE.BufferGeometry;
  color: THREE.Color;
  gradeIntensity: number;
  renderOrder: number;
}

/** Slice a direction's polyline to [fromKm, toKm] with interpolated ends. */
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

function buildRibbon(pts: number[][], widthKm: number, y: number): THREE.BufferGeometry {
  const n = pts.length;
  const positions = new Float32Array(n * 2 * 3);
  const uvs = new Float32Array(n * 2 * 2);
  const indices: number[] = [];
  const half = widthKm / 2;
  const totalS = pts[n - 1][2] - pts[0][2] || 1;

  for (let i = 0; i < n; i++) {
    // Averaged tangent at the vertex — a cheap miter that's fine for the
    // gently-curved, pre-simplified geometry.
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(n - 1, i + 1)];
    let tx = next[0] - prev[0];
    let tz = next[1] - prev[1];
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    const px = -tz;
    const pz = tx;
    const u = (pts[i][2] - pts[0][2]) / totalS;
    const base = i * 6;
    positions[base] = pts[i][0] + px * half;
    positions[base + 1] = y;
    positions[base + 2] = pts[i][1] + pz * half;
    positions[base + 3] = pts[i][0] - px * half;
    positions[base + 4] = y;
    positions[base + 5] = pts[i][1] - pz * half;
    uvs[i * 4] = u;
    uvs[i * 4 + 1] = 0;
    uvs[i * 4 + 2] = u;
    uvs[i * 4 + 3] = 1;
    if (i < n - 1) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

export function LineRibbons() {
  const materials = useRef<{ material: THREE.ShaderMaterial; gradeIntensity: number }[]>([]);

  const ribbons = useMemo<RibbonSpec[]>(() => {
    const specs: RibbonSpec[] = [];
    for (const line of LINES) {
      const dir = line.directions[0];
      if (!dir) continue;
      for (const [gi, grade] of dir.grades.entries()) {
        const pts = slicePolyline(dir, grade.fromKm, grade.toKm);
        if (pts.length < 2) continue;
        specs.push({
          key: `${line.id}-${gi}-${grade.grade}`,
          geometry: buildRibbon(pts, CONFIG.ribbon.widthKm, CONFIG.ribbon.y[grade.grade]),
          color: lineGlow(line.id, line.color),
          gradeIntensity: CONFIG.ribbon.intensity[grade.grade],
          renderOrder: grade.grade === "tunnel" ? 1 : 3,
        });
      }
    }
    return specs;
  }, []);

  useFrame(() => {
    for (const entry of materials.current) {
      if (!entry) continue;
      entry.material.uniforms.uIntensity.value = LIVE.lineIntensity * entry.gradeIntensity;
      entry.material.uniforms.uTime.value = CLOCK.t;
    }
  });

  return (
    <group>
      {ribbons.map((r, i) => (
        <mesh key={r.key} geometry={r.geometry} renderOrder={r.renderOrder} frustumCulled={false}>
          <shaderMaterial
            ref={(m: THREE.ShaderMaterial | null) => {
              if (m) materials.current[i] = { material: m, gradeIntensity: r.gradeIntensity };
            }}
            vertexShader={VERT}
            fragmentShader={FRAG}
            uniforms={{
              uColor: { value: r.color },
              uIntensity: { value: 1 },
              uTime: { value: 0 },
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
