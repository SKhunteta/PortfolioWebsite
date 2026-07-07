import { useMemo } from "react";
import { ExtrudeGeometry, MeshPhysicalMaterial, MeshStandardMaterial, Path, Shape, Vector2 } from "three";
import { PORTHOLE, ROOM } from "../world/config";
import { makeNoiseNormalMap } from "../fx/noiseTextures";
import { registerSurface } from "./surfaces";

// The back wall (z = -D/2) with the porthole punched through it — a real hole
// (extruded shape) so the nebula sphere outside is visible through honest
// geometry — plus the frame torus and a whisper of glass. Transmission is
// deliberately NOT used: it forces a second scene render; a faint transparent
// pane sells the glass for free on every device.

const { w: W, h: H, d: D } = ROOM;

export function Window() {
  const wallGeom = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-W / 2, 0);
    shape.lineTo(W / 2, 0);
    shape.lineTo(W / 2, H);
    shape.lineTo(-W / 2, H);
    shape.closePath();
    const hole = new Path();
    hole.absarc(0, PORTHOLE.y, PORTHOLE.r, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const geom = new ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false, curveSegments: 40 });
    return geom;
  }, []);

  const mats = useMemo(() => {
    const panelNormal = makeNoiseNormalMap(256, 4, 0.9, 11);
    return {
      wall: new MeshStandardMaterial({
        color: "#23262e",
        roughness: 0.72,
        metalness: 0.35,
        normalMap: panelNormal,
        normalScale: new Vector2(0.25, 0.25),
      }),
      frame: new MeshStandardMaterial({ color: "#3d4356", roughness: 0.4, metalness: 0.8 }),
      glass: new MeshPhysicalMaterial({
        color: "#bfe6ff",
        transparent: true,
        opacity: 0.06,
        roughness: 0.05,
        metalness: 0,
        depthWrite: false,
      }),
    };
  }, []);

  return (
    <group>
      {/* Wall spans z from -D/2 - 0.3 (outside) to -D/2 (inner face). */}
      <mesh
        ref={registerSurface}
        geometry={wallGeom}
        material={mats.wall}
        position={[0, 0, -D / 2 - 0.3]}
        receiveShadow
      />
      {/* Porthole frame (torus lies in XY, already facing +z). */}
      <mesh material={mats.frame} position={[0, PORTHOLE.y, -D / 2 - 0.02]}>
        <torusGeometry args={[PORTHOLE.r + 0.06, 0.13, 12, 48]} />
      </mesh>
      {/* The whisper of glass. */}
      <mesh material={mats.glass} position={[0, PORTHOLE.y, -D / 2 - 0.15]}>
        <circleGeometry args={[PORTHOLE.r, 40]} />
      </mesh>
    </group>
  );
}
