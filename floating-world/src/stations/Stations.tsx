// Stations: no longer one anonymous string of dots. Each station carries its
// researched real-world identity (stations/identity.ts): the orb is tinted
// with the signature color of the actual architecture or artwork, it sits at
// its line's true height (elevated decks ride high, underground halls sink
// below the paper and glow through it, like the tunnels), and a watercolor
// seal — a hand-dabbed pigment blot in the accent — marks the surface entrance
// so every stop reads as a distinct place even at drift distance. Underground
// stations hang a faint light shaft from seal to platform (Beacon Hill's
// elevator, in paint).
//
// Orbs still pulse on dwell (train within ~120 m of their arc mark), swelling
// on the global breath. Hover (or tap) any of it reports the station to the
// UI store; Labels.tsx floats the name, StationPanel.tsx tells the story.

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { STATIONS, LINES, LINE_BY_ID } from "../map/network";
import { railHeightAt } from "../map/grade";
import { accentForName } from "./identity";
import { TRAINS, useUi } from "../trains/store";
import { CONFIG } from "../world/config";
import { CLOCK } from "../world/clock";
import { LIVE } from "../world/palettes";
import { INPUT_TOUCH } from "../world/device";
import { NOISE_GLSL, FOG_VARYINGS_VERT, FOG_VARYINGS_FRAG } from "../map/watercolorGlsl";

interface StationSlot {
  id: string;
  name: string;
  x: number;
  z: number;
  // (lineId, directionId) -> station sKm, for train-proximity checks.
  marks: { lineId: string; directionId: number; sKm: number }[];
  pulse: number;
  wasDwelling: boolean;
  accent: THREE.Color;
  railY: number; // the line's eased height at this station's arc mark
  orbY: number;
  submerged: boolean; // platform under the paper — orb renders below ground
  orbIndex: number; // index within its bucket's instanced mesh
}

// Ambient caption pacing: one arrival surfaces at a time, with a long quiet
// gap — a murmur, not a departure board. The first poll marks half the
// network as "arriving" at once, so captions hold off while the intro plays.
const CAPTION_COOLDOWN_S = 14;
const CAPTION_QUIET_START_S = 22;
let lastCaptionT = 0;

const matrix = new THREE.Matrix4();
const color = new THREE.Color();
const SEAL_QUAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
const SEAL_POS = new THREE.Vector3();
const SEAL_SCALE = new THREE.Vector3();

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

// The seal: a watercolor blot dabbed on the paper in the station's accent.
// Normal-blended (it's pigment, not light), so it mixes toward the fog
// itself; the rim pools darker like drying paint, and a per-instance seed
// through world-space noise makes every blot dry differently.
const SEAL_VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  attribute float aSeed;
  varying vec3 vColor;
  varying vec2 vLocal;
  varying float vSeed;
  void main() {
    #ifdef USE_INSTANCING_COLOR
      vColor = instanceColor;
    #else
      vColor = vec3(1.0);
    #endif
    vLocal = position.xy;
    vSeed = aSeed;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const SEAL_FRAG = /* glsl */ `
  ${NOISE_GLSL}
  ${FOG_VARYINGS_FRAG}
  uniform float uOpacity;
  varying vec3 vColor;
  varying vec2 vLocal;
  varying float vSeed;
  void main() {
    float r = length(vLocal);
    float n = wcNoise(vWorld * 7.0 + vSeed);
    float edge = 0.82 + 0.3 * (n - 0.5);
    float body = 1.0 - smoothstep(edge * 0.3, edge, r);
    float rim = smoothstep(edge - 0.45, edge - 0.1, r) * (1.0 - smoothstep(edge - 0.1, edge, r));
    float pigment = body * (0.4 + 0.85 * rim);
    vec3 c = mix(vColor, uFog, fogFactor());
    gl_FragColor = vec4(c, pigment * uOpacity);
  }
`;

// The shaft: for underground halls, a faint column of the accent falling
// from the surface seal to the platform depth. Additive light, so it
// MULTIPLIES by the fog factor; painted below the paper (renderOrder 3) it
// inherits the same submerged dimness as the tunnel ribbons.
const SHAFT_VERT = /* glsl */ `
  ${FOG_VARYINGS_VERT}
  varying vec3 vColor;
  varying float vY;
  void main() {
    #ifdef USE_INSTANCING_COLOR
      vColor = instanceColor;
    #else
      vColor = vec3(1.0);
    #endif
    vY = position.y;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    vec4 mv = viewMatrix * world;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const SHAFT_FRAG = /* glsl */ `
  ${FOG_VARYINGS_FRAG}
  varying vec3 vColor;
  varying float vY;
  void main() {
    float fade = smoothstep(0.5, 0.12, abs(vY));
    gl_FragColor = vec4(vColor * fade * (1.0 - fogFactor()), fade * 0.6);
  }
`;

/** The line's eased rail height at this station's first arc mark — always
 *  agrees with the drawn ribbon, so a station can never float off its track. */
function railYFor(marks: StationSlot["marks"]): number {
  for (const mark of marks) {
    const dir = LINE_BY_ID.get(mark.lineId)?.directions.find(
      (d) => d.directionId === mark.directionId
    );
    if (dir) return railHeightAt(dir, mark.sKm);
  }
  return CONFIG.ribbon.y["at-grade"];
}

export function Stations() {
  const surfaceRef = useRef<THREE.InstancedMesh>(null);
  const submergedRef = useRef<THREE.InstancedMesh>(null);
  const sealRef = useRef<THREE.InstancedMesh>(null);
  const shaftRef = useRef<THREE.InstancedMesh>(null);
  const setHoverStation = useUi((s) => s.setHoverStation);

  const { slots, surfaceSlots, submergedSlots } = useMemo(() => {
    const byId = new Map<string, StationSlot>(
      STATIONS.map((s) => [
        s.id,
        {
          id: s.id,
          name: s.name,
          x: s.x,
          z: s.z,
          marks: [],
          pulse: 0,
          wasDwelling: false,
          accent: accentForName(s.name),
          railY: 0,
          orbY: 0,
          submerged: false,
          orbIndex: 0,
        },
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
    const all = [...byId.values()];
    for (const slot of all) {
      slot.railY = railYFor(slot.marks);
      slot.orbY = slot.railY + CONFIG.station.orbLiftKm;
      slot.submerged = slot.railY < CONFIG.station.submergedRailY;
    }
    const surface = all.filter((s) => !s.submerged);
    const submerged = all.filter((s) => s.submerged);
    surface.forEach((s, i) => (s.orbIndex = i));
    submerged.forEach((s, i) => (s.orbIndex = i));
    return { slots: all, surfaceSlots: surface, submergedSlots: submerged };
  }, []);

  // Every blot dries differently: a deterministic per-station seed offsets
  // the world-space rim noise (no Math.random — reloads look identical).
  const sealSeeds = useMemo(() => {
    const seeds = new Float32Array(slots.length);
    for (let i = 0; i < slots.length; i++) seeds[i] = (i * 7.13) % 19.7;
    return seeds;
  }, [slots]);

  // Static geometry: seals sit on the paper at the surface entrance, shafts
  // hang from the seal down to the underground platform. Set once, before
  // first paint — a lazy effect would flash identity-matrix instances.
  useLayoutEffect(() => {
    const seals = sealRef.current;
    if (seals) {
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        SEAL_POS.set(slot.x, 0.045, slot.z);
        const r = CONFIG.station.sealRadiusKm;
        SEAL_SCALE.set(r, r, r);
        matrix.compose(SEAL_POS, SEAL_QUAT, SEAL_SCALE);
        seals.setMatrixAt(i, matrix);
      }
      seals.instanceMatrix.needsUpdate = true;
    }
    const shafts = shaftRef.current;
    if (shafts) {
      for (let i = 0; i < submergedSlots.length; i++) {
        const slot = submergedSlots[i];
        const top = 0.02;
        const depth = top - slot.railY;
        matrix.makeScale(CONFIG.station.shaftRadiusKm, depth, CONFIG.station.shaftRadiusKm);
        matrix.setPosition(slot.x, top - depth / 2, slot.z);
        shafts.setMatrixAt(i, matrix);
      }
      shafts.instanceMatrix.needsUpdate = true;
    }
  }, [slots, submergedSlots]);

  useFrame(({ camera }) => {
    const surface = surfaceRef.current;
    const submerged = submergedRef.current;
    const seals = sealRef.current;
    const shafts = shaftRef.current;
    if (!surface || !seals) return;

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
      const mesh = slot.submerged ? submerged : surface;
      if (mesh) {
        matrix.makeScale(r, r, r);
        matrix.setPosition(slot.x, slot.orbY, slot.z);
        mesh.setMatrixAt(slot.orbIndex, matrix);

        // Quiet by default; a dwell pushes the orb just over the bloom line —
        // capped, or up close the node goes supernova. The identity accent
        // tints toward the real material/artwork color, harder at night.
        // Submerged halls run brighter: the paper overhead dims them back —
        // and this edition's paper is brighter, so they push harder still.
        const boost = slot.submerged ? 1.6 : 1.0;
        const glow = Math.min(boost, (0.5 + slot.pulse * (0.75 + 0.4 * CLOCK.breath)) * boost);
        color
          .copy(LIVE.station)
          .lerp(slot.accent, LIVE.stationAccentMix)
          .multiplyScalar(glow);
        mesh.setColorAt(slot.orbIndex, color);
      }

      // The seal deepens while its station hosts a train — pigment, not glow.
      color.copy(slot.accent).multiplyScalar(0.85 + slot.pulse * 0.45);
      seals.setColorAt(i, color);
    }

    surface.instanceMatrix.needsUpdate = true;
    if (surface.instanceColor) surface.instanceColor.needsUpdate = true;
    if (submerged) {
      submerged.instanceMatrix.needsUpdate = true;
      if (submerged.instanceColor) submerged.instanceColor.needsUpdate = true;
    }
    if (seals.instanceColor) seals.instanceColor.needsUpdate = true;

    if (shafts) {
      for (let i = 0; i < submergedSlots.length; i++) {
        const slot = submergedSlots[i];
        color.copy(slot.accent).multiplyScalar(0.3 + slot.pulse * (0.9 + 0.3 * CLOCK.breath));
        shafts.setColorAt(i, color);
      }
      if (shafts.instanceColor) shafts.instanceColor.needsUpdate = true;
    }

    const sealMat = seals.material as THREE.ShaderMaterial;
    sealMat.uniforms.uOpacity.value = LIVE.stationSealOpacity;
    sealMat.uniforms.uFogDensity.value = LIVE.fogDensity;
    if (shafts) {
      (shafts.material as THREE.ShaderMaterial).uniforms.uFogDensity.value = LIVE.fogDensity;
    }
  });

  // Hover/tap works on any station body: orb (surface or submerged) or the
  // wider surface seal — the seal is the friendliest touch target.
  const pick = (list: StationSlot[]) => (e: ThreeEvent<PointerEvent | MouseEvent>) =>
    e.instanceId != null ? list[e.instanceId]?.id ?? null : null;

  const handlers = (list: StationSlot[]) => ({
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      if (INPUT_TOUCH) return; // touch uses tap-to-toggle below
      setHoverStation(pick(list)(e));
    },
    onPointerOut: () => {
      if (!INPUT_TOUCH) setHoverStation(null);
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      if (!INPUT_TOUCH) return;
      e.stopPropagation();
      const id = pick(list)(e);
      setHoverStation(useUi.getState().hoverStationId === id ? null : id);
    },
  });

  return (
    <group>
      {/* Surface + elevated orbs — they read from every camera angle. */}
      <instancedMesh
        ref={surfaceRef}
        args={[undefined, undefined, surfaceSlots.length]}
        renderOrder={7}
        frustumCulled={false}
        {...handlers(surfaceSlots)}
      >
        <sphereGeometry args={[1, 20, 14]} />
        <shaderMaterial
          vertexShader={ORB_VERT}
          fragmentShader={ORB_FRAG}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>

      {/* Underground halls: painted BEFORE the paper (renderOrder 3, like the
          tunnel ribbons) so their light is seen through it — submerged, not
          occluded. Same painter's trick, same order table. */}
      {submergedSlots.length > 0 && (
        <instancedMesh
          ref={submergedRef}
          args={[undefined, undefined, submergedSlots.length]}
          renderOrder={3}
          frustumCulled={false}
          {...handlers(submergedSlots)}
        >
          <sphereGeometry args={[1, 20, 14]} />
          <shaderMaterial
            vertexShader={ORB_VERT}
            fragmentShader={ORB_FRAG}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </instancedMesh>
      )}

      {/* Watercolor seals: every station's surface mark, in its accent. */}
      <instancedMesh
        ref={sealRef}
        args={[undefined, undefined, slots.length]}
        renderOrder={7}
        frustumCulled={false}
        {...handlers(slots)}
      >
        <circleGeometry args={[1, 24]}>
          <instancedBufferAttribute attach="attributes-aSeed" args={[sealSeeds, 1]} />
        </circleGeometry>
        <shaderMaterial
          vertexShader={SEAL_VERT}
          fragmentShader={SEAL_FRAG}
          uniforms={{
            uOpacity: { value: LIVE.stationSealOpacity },
            uFog: { value: LIVE.fog }, // palette-by-reference
            uFogDensity: { value: LIVE.fogDensity },
          }}
          transparent
          depthWrite={false}
        />
      </instancedMesh>

      {/* Light shafts under the seals of underground stations, submerged
          with their orbs. */}
      {submergedSlots.length > 0 && (
        <instancedMesh
          ref={shaftRef}
          args={[undefined, undefined, submergedSlots.length]}
          renderOrder={3}
          frustumCulled={false}
        >
          <cylinderGeometry args={[1, 1, 1, 8, 1, true]} />
          <shaderMaterial
            vertexShader={SHAFT_VERT}
            fragmentShader={SHAFT_FRAG}
            uniforms={{
              uFog: { value: LIVE.fog },
              uFogDensity: { value: LIVE.fogDensity },
            }}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </instancedMesh>
      )}
    </group>
  );
}
