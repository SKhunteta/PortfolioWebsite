// Stations: small instanced discs lying on the map. Each one pulses —
// scale and brightness swelling on the global breath — while a train is
// within dwell distance along its line's arc. Hover (or tap) reports the
// station to the UI store; Labels.tsx draws the name.

import { useMemo, useRef } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { STATIONS, LINES } from "../map/network";
import { TRAINS, useUi } from "../trains/store";
import { CONFIG } from "../world/config";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { INPUT_TOUCH } from "../world/device";

interface StationSlot {
  id: string;
  x: number;
  z: number;
  // (lineId, directionId) -> station sKm, for train-proximity checks.
  marks: { lineId: string; directionId: number; sKm: number }[];
  pulse: number;
}

const matrix = new THREE.Matrix4();
const color = new THREE.Color();

export function Stations() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const setHoverStation = useUi((s) => s.setHoverStation);

  const slots = useMemo<StationSlot[]>(() => {
    const byId = new Map<string, StationSlot>(
      STATIONS.map((s) => [s.id, { id: s.id, x: s.x, z: s.z, marks: [], pulse: 0 }])
    );
    for (const line of LINES) {
      for (const dir of line.directions) {
        for (const st of dir.stations) {
          byId.get(st.id)?.marks.push({
            lineId: line.id,
            directionId: dir.directionId,
            sKm: st.sKm,
          });
        }
      }
    }
    return [...byId.values()];
  }, []);

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      // Like the trains, stations are toy-scaled: quiet dots at drift
      // distance would be boulders up close — ease them down as the camera
      // approaches this particular orb.
      const dx = camera.position.x - slot.x;
      const dz = camera.position.z - slot.z;
      const dist = Math.sqrt(dx * dx + camera.position.y * camera.position.y + dz * dz);
      const toyScale = Math.min(1, Math.max(0.12, dist / 30));
      let dwelling = false;
      for (const train of TRAINS.values()) {
        for (const mark of slot.marks) {
          if (
            mark.lineId === train.lineId &&
            mark.directionId === train.dir.directionId &&
            Math.abs(train.sRendered - mark.sKm) < CONFIG.train.dwellStationKm
          ) {
            dwelling = true;
            break;
          }
        }
        if (dwelling) break;
      }

      slot.pulse += ((dwelling ? 1 : 0) - slot.pulse) * Math.min(1, CLOCK.dt * 2.5);
      const swell = 1 + slot.pulse * (CONFIG.station.pulseScale - 1) * (0.6 + 0.4 * CLOCK.breath);
      const r = CONFIG.station.radiusKm * swell * toyScale;
      matrix.makeScale(r, r, r);
      matrix.setPosition(slot.x, 0.05, slot.z);
      mesh.setMatrixAt(i, matrix);

      // Quiet by default; a dwell pushes the orb just over the bloom line —
      // capped, or up close the node goes supernova.
      const glow = Math.min(1.15, 0.55 + slot.pulse * (0.9 + 0.5 * CLOCK.breath));
      color.copy(LIVE.station).multiplyScalar(glow);
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (INPUT_TOUCH) return; // touch uses tap-to-toggle below
    const id = e.instanceId != null ? slots[e.instanceId]?.id ?? null : null;
    setHoverStation(id);
  };

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!INPUT_TOUCH) return;
    e.stopPropagation();
    const id = e.instanceId != null ? slots[e.instanceId]?.id ?? null : null;
    setHoverStation(useUi.getState().hoverStationId === id ? null : id);
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, slots.length]}
      renderOrder={7}
      frustumCulled={false}
      onPointerMove={onMove}
      onPointerOut={() => !INPUT_TOUCH && setHoverStation(null)}
      onClick={onClick}
    >
      {/* Orbs, not discs — they read from every camera angle. */}
      <sphereGeometry args={[1, 20, 14]} />
      <meshBasicMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
}
