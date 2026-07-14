// Trailing ribbons: each train's recent position history over a fixed time
// window, so length is proportional to speed by construction — a fast train
// covers more ground in its window, a dwelling train's trail collapses into
// its own mark. One preallocated buffer for every trail; positions, colors
// and edge coords are rebuilt each frame from the ring buffers (cheap: tens
// of thousands of floats), drawRange skips unused capacity.
//
// The trail is INK, not light: a wet sumi/pigment stroke the train drags
// across the washi. Normal-blended (it darkens the bright paper it crosses,
// per this edition's thesis; additive glow died on the washi), feathered at
// the edges and pooled wide at the wet HEAD, drying to a thin tail — pigment
// soaking into paper rather than a hard geometric ribbon.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TRAINS } from "./store";
import { MAX_TRAINS } from "./Trains";
import { PROFILE } from "../world/device";
import { CONFIG } from "../world/config";
import { LIVE, lineGlow } from "../world/palettes";
import { LINE_BY_ID } from "../map/network";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "../map/watercolorGlsl";

// Two triangles (6 verts) per trail segment, non-indexed soup so separate
// trails never bleed into each other.
const VERTS_PER_SEG = 6;

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute vec4 aColor;
  attribute vec2 aEdge; // x: -1..1 across ribbon, y: 0 dry tail .. 1 wet head
  varying vec4 vColor;
  varying vec2 vEdge;
  void main() {
    vColor = aColor;
    vEdge = aEdge;
    vWorld = position.xz; // trail verts are already in world km
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  uniform float uIntensity;
  varying vec4 vColor;
  varying vec2 vEdge;
  void main() {
    float across = abs(vEdge.x);
    float fresh = vEdge.y;
    // Feathered brush edge: the pigment soaks into the paper instead of
    // stopping at a hard line. The wet head (fresh -> 1) blooms across the
    // whole width; the drying tail keeps a defined but soft core.
    float wet = 0.5 + 0.5 * fresh;               // head pools to full width
    float body = pow(smoothstep(1.0, 1.0 - wet, across), 1.4);
    float mottle = 0.8 + 0.32 * wcNoise(vWorld * 3.0); // uneven soak, like washi
    float a = vColor.a * body * mottle * uIntensity;
    // Normal-blended pigment: mix toward fog per the raw-ShaderMaterial
    // contract, so a distant stroke dissolves into the kasumi.
    vec3 c = mix(vColor.rgb, uFog, fogFactor());
    gl_FragColor = vec4(c, a);
  }
`;

export function Trails() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, positions, colors, edges } = useMemo(() => {
    const maxVerts = MAX_TRAINS * PROFILE.trailSegments * VERTS_PER_SEG;
    const positions = new THREE.BufferAttribute(new Float32Array(maxVerts * 3), 3);
    positions.setUsage(THREE.DynamicDrawUsage);
    const colors = new THREE.BufferAttribute(new Float32Array(maxVerts * 4), 4);
    colors.setUsage(THREE.DynamicDrawUsage);
    // Per-vert (across, freshness): the shader feathers the stroke and pools
    // the wet head from these; matrices stay world-space in `position`.
    const edges = new THREE.BufferAttribute(new Float32Array(maxVerts * 2), 2);
    edges.setUsage(THREE.DynamicDrawUsage);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", positions);
    geometry.setAttribute("aColor", colors);
    geometry.setAttribute("aEdge", edges);
    return { geometry, positions, colors, edges };
  }, []);

  useFrame(() => {
    const pos = positions.array as Float32Array;
    const col = colors.array as Float32Array;
    const edg = edges.array as Float32Array;
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

        // freshness: 1 at the wet head (newest, age 0), 0 at the dry tail.
        const freshA = 1 - ageA;
        const freshB = 1 - ageB;
        // [x, y, z, alpha, across (-1|+1), freshness]
        const quad = [
          [ax + px * wA, ay, az + pz * wA, alphaA, 1, freshA],
          [ax - px * wA, ay, az - pz * wA, alphaA, -1, freshA],
          [bx + px * wB, by, bz + pz * wB, alphaB, 1, freshB],
          [ax - px * wA, ay, az - pz * wA, alphaA, -1, freshA],
          [bx - px * wB, by, bz - pz * wB, alphaB, -1, freshB],
          [bx + px * wB, by, bz + pz * wB, alphaB, 1, freshB],
        ];
        for (const [x, y, z, a, across, fresh] of quad) {
          pos[vert * 3] = x;
          pos[vert * 3 + 1] = y;
          pos[vert * 3 + 2] = z;
          col[vert * 4] = glow.r;
          col[vert * 4 + 1] = glow.g;
          col[vert * 4 + 2] = glow.b;
          col[vert * 4 + 3] = a;
          edg[vert * 2] = across;
          edg[vert * 2 + 1] = fresh;
          vert++;
        }
      }
    }

    geometry.setDrawRange(0, vert);
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    edges.needsUpdate = true;
    if (materialRef.current) {
      materialRef.current.uniforms.uIntensity.value = LIVE.trainIntensity;
      materialRef.current.uniforms.uFogDensity.value = LIVE.fogDensity;
    }
  });

  return (
    <mesh geometry={geometry} renderOrder={8} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uIntensity: { value: 1 },
          uFog: { value: LIVE.fog },
          uFogDensity: { value: LIVE.fogDensity },
        }}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
