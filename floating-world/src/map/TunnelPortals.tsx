// The portal mouths. Riding a train toward the downtown tunnel used to look
// like nothing at all — the track just dimmed into the paper with no mark
// that the ground had swallowed it. Every at-grade↔tunnel boundary now
// wears a hand-inked ARCH stamped over the track (the woodblock's answer to
// a tunnel portal's concrete mouth): a sumi half-ring standing across the
// rail, feet on the paper, drawn in the landmark ink so it sits with the
// bridges and the campanile, not with the light.
//
// One InstancedMesh (an arch per portal, ~10 across the network), normal-
// blended pigment at renderOrder 6 (the landmark layer), mixed toward the
// scene fog per the raw-ShaderMaterial contract. Static after layout.

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LINES } from "./network";
import { slicePolyline } from "./LineRibbons";
import { CONFIG } from "../world/config";
import { LIVE } from "../world/palettes";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "./watercolorGlsl";

const VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

// Dry-brush ink: the ring's edges feather on world-space noise so the arch
// reads dabbed, not die-cut. Pigment, not light — normal blend, darkening
// the paper the way every ink stroke here does.
const FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float n = wcNoise(vWorld * 14.0);
    float across = abs(vUv.x * 2.0 - 1.0); // 0 mid-band → 1 ring edges
    float body = 1.0 - smoothstep(0.55 + 0.35 * (n - 0.5), 1.0, across);
    if (body < 0.01) discard;
    vec3 c = mix(uColor, uFog, fogFactor());
    gl_FragColor = vec4(c, body * uOpacity * (0.82 + 0.18 * n));
  }
`;

interface Portal {
  x: number;
  z: number;
  /** Track heading at the portal (radians about +Y). */
  yaw: number;
}

/** Every boundary where a line's tunnel meets daylight: position + tangent
 *  sampled from the direction polyline just around the boundary arc mark. */
function findPortals(): Portal[] {
  const portals: Portal[] = [];
  for (const line of LINES) {
    const dir = line.directions[0];
    if (!dir) continue;
    const total = dir.cumKm[dir.cumKm.length - 1];
    for (const [gi, grade] of dir.grades.entries()) {
      if (grade.grade !== "tunnel") continue;
      for (const s of [grade.fromKm, grade.toKm]) {
        // A tunnel butted against the line's very end has no mouth there.
        if (s < 0.1 || s > total - 0.1) continue;
        const neighbor = s === grade.fromKm ? dir.grades[gi - 1] : dir.grades[gi + 1];
        if (!neighbor || neighbor.grade === "tunnel") continue;
        const pts = slicePolyline(dir, Math.max(0, s - 0.05), Math.min(total, s + 0.05));
        const a = pts[0];
        const b = pts[pts.length - 1];
        portals.push({
          x: (a[0] + b[0]) / 2,
          z: (a[1] + b[1]) / 2,
          yaw: Math.atan2(b[0] - a[0], b[1] - a[1]),
        });
      }
    }
  }
  return portals;
}

const matrix = new THREE.Matrix4();
const POS = new THREE.Vector3();
const QUAT = new THREE.Quaternion();
const SCALE = new THREE.Vector3();
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export function TunnelPortals() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const portals = useMemo(findPortals, []);

  // The arch: a half-annulus spanning the track, inner radius just clear of
  // the ribbon, standing in the XY plane (rotated per instance so its face
  // looks down the rail). uv.x crosses the band.
  const geometry = useMemo(() => {
    const inner = CONFIG.ribbon.widthKm * 0.75;
    const outer = CONFIG.ribbon.widthKm * 1.15;
    return new THREE.RingGeometry(inner, outer, 20, 1, 0, Math.PI);
  }, []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < portals.length; i++) {
      const p = portals[i];
      POS.set(p.x, 0.005, p.z); // feet on the paper
      QUAT.setFromAxisAngle(Y_AXIS, p.yaw);
      SCALE.set(1, 1, 1);
      matrix.compose(POS, QUAT, SCALE);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [portals]);

  useFrame(() => {
    const mat = materialRef.current;
    if (mat) {
      mat.uniforms.uOpacity.value = LIVE.landmarkOpacity;
      mat.uniforms.uFogDensity.value = LIVE.fogDensity;
    }
  });

  if (portals.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, portals.length]}
      renderOrder={6}
      frustumCulled={false}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uColor: { value: LIVE.landmark }, // palette-by-reference sepia ink
          uOpacity: { value: LIVE.landmarkOpacity },
          uFog: { value: LIVE.fog },
          uFogDensity: { value: LIVE.fogDensity },
        }}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}
