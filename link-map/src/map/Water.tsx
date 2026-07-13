// Dark water masses, breathing almost imperceptibly on the global clock.
// Painter's-order layer 0 — everything else draws over them.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WATER } from "./waterData";
import { projectLatLng } from "./network";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";

function toShape(ring: [number, number][]): THREE.Shape {
  const shape = new THREE.Shape();
  ring.forEach(([lat, lng], i) => {
    const { x, z } = projectLatLng(lat, lng);
    // Shape lives in XY; the mesh's rotation.x = -PI/2 maps local +Y to
    // world -Z, so feed it (x, -z).
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  return shape;
}

export function Water() {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  const geometry = useMemo(() => {
    const shapes = WATER.map((body) => {
      const shape = toShape(body.ring);
      for (const hole of body.holes ?? []) {
        const path = new THREE.Path();
        hole.forEach(([lat, lng], i) => {
          const { x, z } = projectLatLng(lat, lng);
          if (i === 0) path.moveTo(x, -z);
          else path.lineTo(x, -z);
        });
        shape.holes.push(path);
      }
      return shape;
    });
    return new THREE.ShapeGeometry(shapes);
  }, []);

  useFrame(() => {
    const m = materialRef.current;
    if (!m) return;
    m.color.copy(LIVE.water);
    m.opacity = 0.55 + 0.1 * CLOCK.breath;
  });

  return (
    <mesh
      geometry={geometry}
      rotation-x={-Math.PI / 2}
      position-y={-0.06}
      renderOrder={0}
      frustumCulled={false}
    >
      <meshBasicMaterial ref={materialRef} transparent depthWrite={false} />
    </mesh>
  );
}
