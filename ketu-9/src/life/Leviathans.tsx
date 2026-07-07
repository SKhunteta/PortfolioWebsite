import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  LatheGeometry,
  MathUtils,
  MeshStandardMaterial,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";
import { POI } from "../world/locations";
import { useWorldClock } from "../world/WorldClock";
import { dayness } from "../world/sun";
import { makeNoiseNormalMap, makeNoiseRoughnessMap } from "../fx/noiseTextures";
import { emitBurst } from "../fx/particles";
import { BREACH, directionFlags, setTrackPoint, setTrackYaw, useDirection } from "./direction";

// The pod — eight-limbed leviathans. Whale-scale (~95 m for the hero) filter
// feeders that cruise the drowned fjord basins as huge slow shadows under the
// translucent sea. Breaching is no longer a metronome: the default state is a
// deep cruise, and a breach is a PERFORMANCE — commanded by the Observer
// director (or fired ambiently between tours) — an accelerating rise from
// ~60 m down, an explosive surface break, a full airborne roll that flashes
// the bioluminescent ventral photophores at the sky, and a re-entry plume.
// The trajectory is a pure function of u = t - stateStart against the BREACH
// timeline in direction.ts, so close-up shots can be cut to the frame.

const POD = [
  // size 1.7 => ~95 m nose-to-tail: awe-of-scale megafauna, not merely whales.
  { radius: 240, speed: 0.031, phase: 0, dive: 0.21, size: 1.7 },
  { radius: 300, speed: 0.026, phase: 2.6, dive: 0.17, size: 1.35 },
  { radius: 180, speed: 0.037, phase: 4.4, dive: 0.26, size: 1.05 },
];

const CRUISE_DEPTH = 16; // × size — a moving shadow under the sea
const WINDUP_DEPTH = 34; // × size — where the rise begins
const APEX_HEIGHT = 14; // × size — keel fully clear of the water
const HALF_HANG = (BREACH.REENTRY_AT - BREACH.BREAK_AT) / 2; // parabola half-width

/** Whale hull: 14-point profile, 64 radial segments, a faint undulation so
 *  flank highlights ripple instead of reading as a perfect solid of revolution. */
function makeBodyGeometry(): LatheGeometry {
  const raw: [number, number][] = [
    [0.01, -27], // tail tip
    [0.9, -23.5],
    [1.8, -19.5],
    [2.9, -14],
    [3.9, -8],
    [4.8, -2],
    [5.3, 3],
    [5.45, 8],
    [5.1, 13],
    [4.4, 17.5],
    [3.4, 21],
    [2.3, 24],
    [1.2, 26.2],
    [0.01, 27.5], // nose
  ];
  const profile = raw.map(
    ([r, y]) => new Vector2(r * (1 + 0.045 * Math.sin(y * 0.85 + 1.3)), y)
  );
  const geom = new LatheGeometry(profile, 64);
  geom.rotateX(Math.PI / 2); // lathe axis Y -> body along Z
  geom.scale(1, 0.82, 1); // slightly flattened, like a swimmer
  geom.computeVertexNormals();
  return geom;
}

/** One swept-back tail fluke as a flat fan (mirrored for the pair). */
function makeFlukeGeometry(): BufferGeometry {
  const verts = new Float32Array([
    0, 0, 1.6, // root leading edge
    0, 0, -2.6, // root trailing edge
    3.2, 0, 0.2, // mid leading
    6.4, 0, -3.4, // swept tip
    2.9, 0, -4.2, // trailing notch
  ]);
  const geom = new BufferGeometry();
  geom.setAttribute("position", new BufferAttribute(verts, 3));
  geom.setIndex([0, 1, 2, 2, 1, 4, 2, 4, 3]);
  geom.computeVertexNormals();
  return geom;
}

/** Photophore constellations: points seeded on the hull surface (flank +
 *  ventral bias), pushed slightly off the skin. Deterministic per seed. */
function makePhotophoreGeometry(bodyGeom: LatheGeometry, count: number, seed: number): BufferGeometry {
  const pos = bodyGeom.getAttribute("position") as BufferAttribute;
  const nrm = bodyGeom.getAttribute("normal") as BufferAttribute;
  const positions: number[] = [];
  const phases: number[] = [];
  const sizes: number[] = [];
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const total = pos.count;
  for (let k = 0; k < count * 3 && positions.length / 3 < count; k++) {
    const i = Math.floor(rand() * total);
    const y = pos.getY(i);
    if (y > 2.2) continue; // flank/ventral bias — the back stays dark
    positions.push(
      pos.getX(i) + nrm.getX(i) * 0.18,
      y + nrm.getY(i) * 0.18,
      pos.getZ(i) + nrm.getZ(i) * 0.18
    );
    phases.push(rand() * Math.PI * 2);
    sizes.push(0.55 + rand() * 0.75);
  }
  const geom = new BufferGeometry();
  geom.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geom.setAttribute("aPhase", new BufferAttribute(new Float32Array(phases), 1));
  geom.setAttribute("aSize", new BufferAttribute(new Float32Array(sizes), 1));
  return geom;
}

const photophoreVertex = /* glsl */ `
  attribute float aPhase;
  attribute float aSize;
  uniform float uTime;
  uniform float uPixelScale;
  varying float vI;
  void main() {
    vI = 0.6 + 0.4 * sin(uTime * 1.7 + aPhase);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelScale / max(1.0, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const photophoreFragment = /* glsl */ `
  precision highp float;
  uniform float uGlow;
  varying float vI;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.15, d);
    // Teal biolum — intensity deliberately exceeds 1.0 in the Dark so the
    // Bloom pass picks the constellation up.
    gl_FragColor = vec4(vec3(0.35, 1.0, 0.85) * (uGlow * vI * a), 1.0);
  }
`;

interface TentacleProps {
  material: MeshStandardMaterial;
  position: [number, number, number];
  baseYaw: number;
  swayPhase: number;
  /** Shared performance signal: 1 = streamlined against the body for the rise. */
  perf: { streamline: number };
}

/** Four nested, tapering segments; rocking each joint bends the whole limb.
 *  During a breach the limbs sweep back and trail — rowing would read wrong. */
function Tentacle({ material, position, baseYaw, swayPhase, perf }: TentacleProps) {
  const joints = useRef<(Group | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const sl = perf.streamline;
    const amp = 1 - 0.7 * sl;
    const base = 0.55 + 0.35 * sl;
    joints.current.forEach((joint, i) => {
      if (!joint) return;
      // The wave travels tipward: later joints lag the base.
      joint.rotation.x = base + Math.sin(t * 0.9 + swayPhase - i * 0.7) * 0.22 * amp;
      joint.rotation.z = Math.sin(t * 0.6 + swayPhase * 1.3 - i * 0.5) * 0.14 * amp;
    });
  });

  const radii = [1.5, 1.05, 0.65, 0.32];
  const segLen = 7;

  // Build the nested chain inside-out so each segment is a child of the last.
  let chain: JSX.Element | null = null;
  for (let i = radii.length - 1; i >= 0; i--) {
    chain = (
      <group
        key={i}
        ref={(el) => (joints.current[i] = el)}
        position={i === 0 ? [0, 0, 0] : [0, -segLen, 0]}
      >
        <mesh material={material} position={[0, -segLen / 2, 0]} castShadow>
          <cylinderGeometry args={[radii[i] * 0.7, radii[i], segLen, 8]} />
        </mesh>
        {chain}
      </group>
    );
  }

  return (
    <group position={position} rotation={[0, baseYaw, 0]}>
      {chain}
    </group>
  );
}

interface LevState {
  mode: "cruise" | "breach";
  /** Integrated performance clock (clamped dt — the SAME time base as the
   *  Observer's shot clock, so cued choreography can't desynchronize when a
   *  frame hitches). All FSM timing runs on this, never on raw elapsedTime. */
  time: number;
  stateStart: number;
  angle: number; // integrated so cruise ⇄ breach is continuous
  yStart: number; // y when the windup began
  prevY: number;
  lastSeq: number;
  spoutFired: boolean;
  nextAmbient: number;
}

function Leviathan({
  index,
  bodyGeom,
  flukeGeom,
  photophoreMatBase,
  material,
  finMaterial,
  ventralMaterial,
  radius,
  speed,
  phase,
  dive,
  size,
}: (typeof POD)[number] & {
  index: number;
  bodyGeom: LatheGeometry;
  flukeGeom: BufferGeometry;
  photophoreMatBase: ShaderMaterial;
  material: MeshStandardMaterial;
  finMaterial: MeshStandardMaterial;
  ventralMaterial: MeshStandardMaterial;
}) {
  const root = useRef<Group>(null);
  const pitchGroup = useRef<Group>(null);

  const st = useRef<LevState>({
    mode: "cruise",
    time: 0,
    stateStart: 0,
    angle: phase,
    yStart: -CRUISE_DEPTH,
    prevY: -CRUISE_DEPTH,
    lastSeq: 0,
    spoutFired: false,
    nextAmbient: 30 + phase * 12,
  });
  const perf = useMemo(() => ({ streamline: 0 }), []);
  const photophoreGeom = useMemo(
    () => makePhotophoreGeometry(bodyGeom, 240, 1 + index * 977),
    [bodyGeom, index]
  );
  const photophoreMat = useMemo(() => photophoreMatBase.clone(), [photophoreMatBase]);
  const scratch = useRef({ v: new Vector3(), up: new Vector3(0, 1, 0) });

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const t = state.clock.elapsedTime; // cosmetic sways only
    const g = root.current;
    const s = st.current;
    if (!g) return;
    s.time += dt;

    // --- Cues from the Observer director (or console). -----------------------
    const dirState = useDirection.getState();
    if (dirState.seq !== s.lastSeq) {
      s.lastSeq = dirState.seq;
      if (dirState.cue?.kind === "leviathanBreach" && dirState.cue.index === index && s.mode !== "breach") {
        s.mode = "breach";
        s.stateStart = s.time;
        s.yStart = g.position.y;
        s.spoutFired = false;
      }
    }
    // Ambient breaches keep the basin alive between tours.
    if (s.mode === "cruise" && !directionFlags.observing && s.time >= s.nextAmbient) {
      s.mode = "breach";
      s.stateStart = s.time;
      s.yStart = g.position.y;
      s.spoutFired = false;
    }

    // --- Trajectory. ---------------------------------------------------------
    const cruiseY = () => -CRUISE_DEPTH * size + Math.sin(s.time * dive + phase * 1.7) * 3 * size;
    let y: number;
    let speedMult = 1;
    let roll = 0;
    let streamlineTarget = 0;
    if (s.mode === "breach") {
      const u = s.time - s.stateStart;
      if (u >= BREACH.TOTAL) {
        s.mode = "cruise";
        s.nextAmbient = s.time + 55 + ((index * 13.7 + Math.floor(s.time)) % 45);
        y = cruiseY();
      } else if (u < BREACH.windup) {
        // Sink and gather speed.
        y = MathUtils.lerp(s.yStart, -WINDUP_DEPTH * size, MathUtils.smoothstep(u, 0, BREACH.windup));
        speedMult = MathUtils.lerp(1, 1.7, u / BREACH.windup);
        streamlineTarget = 1;
      } else if (u < BREACH.BREAK_AT) {
        // The rise: slow and ominous out of the deep, explosive at the surface.
        const p = (u - BREACH.windup) / (BREACH.BREAK_AT - BREACH.windup);
        y = -WINDUP_DEPTH * size * (1 - Math.pow(p, 2.4));
        speedMult = 1.7;
        streamlineTarget = 1;
      } else if (u < BREACH.REENTRY_AT) {
        // Airborne: an authored parabola through the two surface crossings,
        // with the show-off roll — ventral photophores flash at the sky.
        const w = (u - BREACH.APEX_AT) / HALF_HANG;
        y = APEX_HEIGHT * size * (1 - w * w);
        speedMult = 1.7;
        roll = 0.85 * Math.sin(Math.PI * MathUtils.clamp((u - (BREACH.BREAK_AT + 0.3)) / 1.8, 0, 1));
        streamlineTarget = 1;
      } else {
        // Dive back to the cruise line (evaluated live so the hand-off is C0).
        const p = MathUtils.smoothstep(u, BREACH.REENTRY_AT, BREACH.TOTAL);
        y = MathUtils.lerp(0, cruiseY(), p);
        speedMult = MathUtils.lerp(1.7, 1, p);
        streamlineTarget = 1 - p;
      }
    } else {
      y = cruiseY();
    }
    perf.streamline = MathUtils.damp(perf.streamline, streamlineTarget, 3, dt);

    s.angle += speed * speedMult * dt;
    const a = s.angle;
    const { x: cx, z: cz } = POI.leviathanPool;
    const x = cx + Math.cos(a) * radius;
    const z = cz + Math.sin(a) * radius;
    g.position.set(x, y, z);
    g.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));

    // Pitch from the actual vertical velocity: nose drives the trajectory.
    const vy = (y - s.prevY) / Math.max(dt, 1e-4);
    const vxz = Math.max(2, Math.abs(speed * speedMult) * radius);
    if (pitchGroup.current) {
      // Asymmetric clamp: steep nose-up on the rise, gentler nose-down on the
      // dive so the tail slips under (flukes last) instead of flagpoling.
      pitchGroup.current.rotation.x = -MathUtils.clamp(Math.atan2(vy, vxz), -0.65, 1.0) * 0.9;
      pitchGroup.current.rotation.z = roll + Math.sin(t * 0.3 + phase) * 0.04 * (1 - perf.streamline);
    }

    // --- Surface events: splash plumes at the crossings, spout after break. --
    const up = scratch.current.up;
    if (s.prevY < 0 && y >= 0) {
      scratch.current.v.set(x, 0.5, z);
      emitBurst({
        kind: "splash", origin: scratch.current.v, dir: up,
        count: Math.round(220 * size), baseSpeed: 24 * Math.sqrt(size),
        spread: 0.5, life: 2.0, size: 5.5,
      });
      emitBurst({
        kind: "sprayRing", origin: scratch.current.v,
        count: 160, baseSpeed: 12 * Math.sqrt(size), spread: 0, life: 2.2, size: 4.0,
      });
    }
    if (s.prevY > 0 && y <= 0) {
      scratch.current.v.set(x, 0.5, z);
      emitBurst({
        kind: "splash", origin: scratch.current.v, dir: up,
        count: Math.round(390 * size), baseSpeed: 21 * Math.sqrt(size),
        spread: 0.65, life: 2.4, size: 6.5,
      });
      emitBurst({
        kind: "sprayRing", origin: scratch.current.v,
        count: 200, baseSpeed: 15 * Math.sqrt(size), spread: 0, life: 2.4, size: 4.5,
      });
    }
    if (s.mode === "breach" && !s.spoutFired && s.time - s.stateStart >= BREACH.BREAK_AT + 0.35) {
      s.spoutFired = true;
      const fx = Math.sin(g.rotation.y);
      const fz = Math.cos(g.rotation.y);
      scratch.current.v.set(x + fx * 14 * size, Math.max(y, 0) + 5 * size, z + fz * 14 * size);
      emitBurst({
        kind: "spout", origin: scratch.current.v, dir: up,
        count: 60, baseSpeed: 14, spread: 0.12, life: 1.6, size: 0.9,
      });
    }
    s.prevY = y;

    // --- Photophores + track points. -----------------------------------------
    const d = dayness(useWorldClock.getState().phase);
    const depthBoost = MathUtils.lerp(1.0, 1.6, MathUtils.clamp(-y / (30 * size), 0, 1));
    photophoreMat.uniforms.uTime.value = t;
    photophoreMat.uniforms.uGlow.value = MathUtils.lerp(2.6, 0.4, d) * depthBoost;
    photophoreMat.uniforms.uPixelScale.value =
      (state.gl.getPixelRatio() * state.size.height) /
      (2 * Math.tan((((state.camera as { fov?: number }).fov ?? 55) * Math.PI) / 360));

    if (index === 0) {
      setTrackPoint("lev0", g.position);
      setTrackYaw("lev0", g.rotation.y);
      scratch.current.v.set(x, 2, z);
      setTrackPoint("lev0Surface", scratch.current.v);
      setTrackYaw("lev0Surface", g.rotation.y);
    }
  });

  // Eight limbs: four per side along the rear half.
  const tentacles: TentacleProps[] = [];
  for (let i = 0; i < 4; i++) {
    const zPos = -6 - i * 5.5;
    tentacles.push(
      { material, position: [4.2, -2.5, zPos], baseYaw: 0.5, swayPhase: i * 1.4, perf },
      { material, position: [-4.2, -2.5, zPos], baseYaw: -0.5, swayPhase: i * 1.4 + 0.9, perf }
    );
  }

  return (
    <group ref={root} scale={size}>
      <group ref={pitchGroup}>
        <mesh geometry={bodyGeom} material={material} castShadow />
        <points geometry={photophoreGeom} material={photophoreMat} />
        {/* ventral stripe — pale belly so the breach roll reads */}
        <mesh material={ventralMaterial} position={[0, -3.2, 6]} scale={[3.4, 1.6, 16]}>
          <sphereGeometry args={[1, 16, 12]} />
        </mesh>
        {/* dorsal keel */}
        <mesh material={material} position={[0, 4.4, -4]} rotation={[0.25, 0, 0]} scale={[0.5, 3.2, 6]} castShadow>
          <sphereGeometry args={[1, 12, 8]} />
        </mesh>
        {/* tail flukes — swept fans, not blobs */}
        <mesh geometry={flukeGeom} material={finMaterial} position={[1.0, 0.4, -25]} rotation={[0, 0.15, 0.1]} castShadow />
        <mesh geometry={flukeGeom} material={finMaterial} position={[-1.0, 0.4, -25]} rotation={[0, -0.15, -0.1]} scale={[-1, 1, 1]} castShadow />
        {tentacles.map((tp, i) => (
          <Tentacle key={i} {...tp} />
        ))}
      </group>
    </group>
  );
}

export function Leviathans() {
  const bodyGeom = useMemo(makeBodyGeometry, []);
  const flukeGeom = useMemo(makeFlukeGeometry, []);

  const maps = useMemo(
    () => ({
      normal: makeNoiseNormalMap(256, 4, 2.2, 41),
      rough: makeNoiseRoughnessMap(256, 4, 0.4, 0.7, 42),
    }),
    []
  );

  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#2a3a44",
        roughness: 0.55,
        roughnessMap: maps.rough,
        normalMap: maps.normal,
        normalScale: new Vector2(0.35, 0.35),
        metalness: 0.05,
        // Faint bioluminescence (this is an ember-run world) so the pod reads
        // against dark water at the hinge instead of vanishing dark-on-dark.
        emissive: "#0c4f46",
        emissiveIntensity: 0.65,
      }),
    [maps]
  );
  const finMaterial = useMemo(() => {
    const m = material.clone();
    m.side = 2; // DoubleSide — the flukes are flat fans
    return m;
  }, [material]);
  const ventralMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#9fb4b6",
        roughness: 0.6,
        normalMap: maps.normal,
        normalScale: new Vector2(0.25, 0.25),
        metalness: 0,
        emissive: "#7fd8c0",
        emissiveIntensity: 0.4,
      }),
    [maps]
  );
  const photophoreMatBase = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: photophoreVertex,
        fragmentShader: photophoreFragment,
        uniforms: {
          uTime: { value: 0 },
          uGlow: { value: 1 },
          uPixelScale: { value: 600 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    []
  );

  // Season drive for the hide itself: the glow deepens as the Dark falls.
  useFrame(() => {
    const d = dayness(useWorldClock.getState().phase);
    material.emissiveIntensity = MathUtils.lerp(1.2, 0.45, d);
    finMaterial.emissiveIntensity = material.emissiveIntensity;
    ventralMaterial.emissiveIntensity = MathUtils.lerp(0.9, 0.35, d);
  });

  return (
    <group>
      {POD.map((animal, i) => (
        <Leviathan
          key={i}
          index={i}
          {...animal}
          bodyGeom={bodyGeom}
          flukeGeom={flukeGeom}
          photophoreMatBase={photophoreMatBase}
          material={material}
          finMaterial={finMaterial}
          ventralMaterial={ventralMaterial}
        />
      ))}
    </group>
  );
}
