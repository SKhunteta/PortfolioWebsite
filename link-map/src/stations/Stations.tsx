// Stations: small instanced discs lying on the map. Each one pulses —
// scale and brightness swelling on the global breath — while a train is
// within dwell distance along its line's arc. Hover (or tap) reports the
// station to the UI store; Labels.tsx draws the name.

import { useMemo, useRef } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { STATIONS, LINES, LINE_BY_ID } from "../map/network";
import { TRAINS, useUi } from "../trains/store";
import { CONFIG } from "../world/config";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { INPUT_TOUCH } from "../world/device";

interface StationSlot {
  id: string;
  name: string;
  x: number;
  z: number;
  // (lineId, directionId) -> station sKm, for train-proximity checks.
  marks: { lineId: string; directionId: number; sKm: number }[];
  pulse: number;
  wasDwelling: boolean;
}

// Ambient caption pacing: one arrival surfaces at a time, with a long quiet
// gap — a murmur, not a departure board. The first poll marks half the
// network as "arriving" at once, so captions hold off while the intro plays.
const CAPTION_COOLDOWN_S = 14;
const CAPTION_QUIET_START_S = 22;
let lastCaptionT = 0;

const matrix = new THREE.Matrix4();
const color = new THREE.Color();

// A bare additive sphere reads as a hard-edged ping-pong ball. Fade toward
// the silhouette (view-space normal) so the orb is a soft breath of light.
// instanceMatrix/instanceColor are three's auto-injected instancing
// attributes (same contract TrainModel relies on).
const ORB_VERT = /* glsl */ `
  varying float vFacing;
  varying vec3 vColor;
  void main() {
    #ifdef USE_INSTANCING_COLOR
      vColor = instanceColor;
    #else
      vColor = vec3(1.0);
    #endif
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vec3 nV = normalize(mat3(modelViewMatrix) * mat3(instanceMatrix) * normal);
    vFacing = max(0.0, nV.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const ORB_FRAG = /* glsl */ `
  varying float vFacing;
  varying vec3 vColor;
  void main() {
    float soft = pow(vFacing, 1.6);
    gl_FragColor = vec4(vColor * (0.35 + 0.85 * soft), soft);
  }
`;

export function Stations() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const setHoverStation = useUi((s) => s.setHoverStation);

  const slots = useMemo<StationSlot[]>(() => {
    const byId = new Map<string, StationSlot>(
      STATIONS.map((s) => [
        s.id,
        { id: s.id, name: s.name, x: s.x, z: s.z, marks: [], pulse: 0, wasDwelling: false },
      ])
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
      let dwellMark: StationSlot["marks"][number] | null = null;
      for (const train of TRAINS.values()) {
        for (const mark of slot.marks) {
          if (
            mark.lineId === train.lineId &&
            mark.directionId === train.dir.directionId &&
            Math.abs(train.sRendered - mark.sKm) < CONFIG.train.dwellStationKm
          ) {
            dwelling = true;
            dwellMark = mark;
            break;
          }
        }
        if (dwelling) break;
      }

      // Arrival = the dwell rising edge. React write on events only —
      // the hot path never touches the store per-frame.
      if (dwelling && !slot.wasDwelling && dwellMark) {
        if (CLOCK.t > CAPTION_QUIET_START_S && CLOCK.t - lastCaptionT > CAPTION_COOLDOWN_S) {
          lastCaptionT = CLOCK.t;
          const line = LINE_BY_ID.get(dwellMark.lineId);
          const headsign = line?.directions.find(
            (d) => d.directionId === dwellMark.directionId
          )?.headsign;
          const dest = headsign ? ` to ${headsign}` : "";
          useUi.getState().setCaption(`${slot.name} · ${line?.name ?? "Link"}${dest}`);
        }
      }
      slot.wasDwelling = dwelling;

      slot.pulse += ((dwelling ? 1 : 0) - slot.pulse) * Math.min(1, CLOCK.dt * 2.5);
      const swell = 1 + slot.pulse * (CONFIG.station.pulseScale - 1) * (0.6 + 0.4 * CLOCK.breath);
      const r = CONFIG.station.radiusKm * swell * toyScale;
      matrix.makeScale(r, r, r);
      matrix.setPosition(slot.x, 0.05, slot.z);
      mesh.setMatrixAt(i, matrix);

      // Quiet by default; a dwell pushes the orb just over the bloom line —
      // capped, or up close the node goes supernova.
      const glow = Math.min(1.0, 0.5 + slot.pulse * (0.75 + 0.4 * CLOCK.breath));
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
      <shaderMaterial
        vertexShader={ORB_VERT}
        fragmentShader={ORB_FRAG}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}
