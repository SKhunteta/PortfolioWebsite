// The translucent ground. Tunnel ribbons render BENEATH it and are seen
// through it — that dimmed, submerged read is the whole tunnel effect, and
// it depends on painter's order, not the depth buffer.
//
// Render-order contract (every layer transparent, depthWrite false):
//   0 water · 1 tunnel ribbons · 2 ground · 3 surface/elevated ribbons
//   4 stations · 5 trains + trails · 6 labels

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LIVE } from "../world/palettes";
import { CENTROID } from "./network";

export function GroundPlane() {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const m = materialRef.current;
    if (!m) return;
    m.color.copy(LIVE.ground);
    m.opacity = LIVE.groundOpacity;
  });

  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[CENTROID.x, 0, CENTROID.z]}
      renderOrder={2}
      frustumCulled={false}
    >
      <planeGeometry args={[400, 400]} />
      <meshBasicMaterial ref={materialRef} transparent depthWrite={false} />
    </mesh>
  );
}
