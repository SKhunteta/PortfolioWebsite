// Trailing ribbons: each train's recent position history over a fixed time
// window, so length is proportional to speed by construction — a fast train
// covers more ground in its window, a dwelling train's trail collapses into
// its own glow. One preallocated buffer for every trail; positions and
// colors are rebuilt each frame from the ring buffers (cheap: tens of
// thousands of floats), drawRange skips unused capacity.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TRAINS } from "./store";
import { MAX_TRAINS } from "./Trains";
import { PROFILE } from "../world/device";
import { CONFIG } from "../world/config";
import { LIVE, lineGlow } from "../world/palettes";
import { LINE_BY_ID } from "../map/network";

// Two triangles (6 verts) per trail segment, non-indexed soup so separate
// trails never bleed into each other.
const VERTS_PER_SEG = 6;

const VERT = /* glsl */ `
  attribute vec4 aColor;
  varying vec4 vColor;
  void main() {
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform float uIntensity;
  varying vec4 vColor;
  void main() {
    gl_FragColor = vec4(vColor.rgb * uIntensity, vColor.a);
  }
`;

export function Trails() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, positions, colors } = useMemo(() => {
    const maxVerts = MAX_TRAINS * PROFILE.trailSegments * VERTS_PER_SEG;
    const positions = new THREE.BufferAttribute(new Float32Array(maxVerts * 3), 3);
    positions.setUsage(THREE.DynamicDrawUsage);
    const colors = new THREE.BufferAttribute(new Float32Array(maxVerts * 4), 4);
    colors.setUsage(THREE.DynamicDrawUsage);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", positions);
    geometry.setAttribute("aColor", colors);
    return { geometry, positions, colors };
  }, []);

  useFrame(() => {
    const pos = positions.array as Float32Array;
    const col = colors.array as Float32Array;
    let vert = 0;

    for (const train of TRAINS.values()) {
      const n = train.trailCount;
      if (n < 2) continue;
      const glow = lineGlow(train.lineId, LINE_BY_ID.get(train.lineId)?.color ?? "#5fe3b0");
      const cap = train.trail.length / 3;

      // Walk oldest -> newest through the ring.
      for (let k = 0; k < n - 1; k++) {
        const iA = (train.trailHead - (n - 1) + k + cap * 2) % cap;
        const iB = (train.trailHead - (n - 1) + k + 1 + cap * 2) % cap;
        const ax = train.trail[iA * 3];
        const ay = train.trail[iA * 3 + 1];
        const az = train.trail[iA * 3 + 2];
        const bx = train.trail[iB * 3];
        const by = train.trail[iB * 3 + 1];
        const bz = train.trail[iB * 3 + 2];
        let dx = bx - ax;
        let dz = bz - az;
        const len = Math.hypot(dx, dz);
        if (len < 1e-6) continue;
        dx /= len;
        dz /= len;
        const px = -dz;
        const pz = dx;

        // Age fades and tapers toward the tail.
        const ageA = 1 - k / (n - 1);
        const ageB = 1 - (k + 1) / (n - 1);
        const wA = (CONFIG.trail.widthKm / 2) * (1 - ageA * 0.85);
        const wB = (CONFIG.trail.widthKm / 2) * (1 - ageB * 0.85);
        const alphaA = (1 - ageA) * CONFIG.trail.intensity;
        const alphaB = (1 - ageB) * CONFIG.trail.intensity;

        if ((vert + VERTS_PER_SEG) * 3 > pos.length) break;

        const quad = [
          [ax + px * wA, ay, az + pz * wA, alphaA],
          [ax - px * wA, ay, az - pz * wA, alphaA],
          [bx + px * wB, by, bz + pz * wB, alphaB],
          [ax - px * wA, ay, az - pz * wA, alphaA],
          [bx - px * wB, by, bz - pz * wB, alphaB],
          [bx + px * wB, by, bz + pz * wB, alphaB],
        ];
        for (const [x, y, z, a] of quad) {
          pos[vert * 3] = x;
          pos[vert * 3 + 1] = y;
          pos[vert * 3 + 2] = z;
          col[vert * 4] = glow.r;
          col[vert * 4 + 1] = glow.g;
          col[vert * 4 + 2] = glow.b;
          col[vert * 4 + 3] = a;
          vert++;
        }
      }
    }

    geometry.setDrawRange(0, vert);
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    if (materialRef.current) {
      materialRef.current.uniforms.uIntensity.value = LIVE.trainIntensity;
    }
  });

  return (
    <mesh geometry={geometry} renderOrder={8} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{ uIntensity: { value: 1 } }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
