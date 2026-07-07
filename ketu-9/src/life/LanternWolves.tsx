import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  CanvasTexture,
  Group,
  MathUtils,
  MeshStandardMaterial,
  SpriteMaterial,
  Vector3,
} from "three";
import { sampleHeight } from "../terrain/heightfield";
import { POI } from "../world/locations";
import { useWorldClock } from "../world/WorldClock";
import { dayness } from "../world/sun";
import { emitBurst } from "../fx/particles";
import { HOWL, directionFlags, setTrackPoint, setTrackYaw, useDirection } from "./direction";

// Lantern wolves — canon: Dark-only, aurora-lit, buried in the Bright. The
// pack patrols the west edge of the glassbear bench, and you read them the
// way the canon wants: as a loose ring of small green fires moving on the
// ice, long before you resolve an animal under each one. Rows of photophores
// stitch every flank, the tail carries a stern-light, and the throat lantern
// flares when a wolf howls.
//
// Behavior: trot ⇄ howl FSM against the exported HOWL timeline in
// direction.ts (the Observer cues the pack leader; the rest of the pack
// choruses in ~0.9 s apart — the chorus is directed BY the leader's howl, so
// it fires during tours too). In the Bright the pack is gone — buried — and
// the whole group un-renders until the sun is properly down.

const DEN = POI.wolfDen;
const SCALE = 1.7; // shoulder ~1.5 m — a big, high-latitude wolf

const smooth = (u: number, a: number, b: number) => MathUtils.smoothstep(u, a, b);

const PACK = [
  { radius: 42, speed: 0.055, phase: 0.0, size: 1.0 }, // the leader
  { radius: 54, speed: 0.047, phase: 1.9, size: 0.92 },
  { radius: 63, speed: 0.041, phase: 3.4, size: 0.95 },
  { radius: 71, speed: 0.037, phase: 4.6, size: 0.88 },
  { radius: 49, speed: 0.051, phase: 5.4, size: 0.82 }, // the young one, inside track
];

// Chorus bus: bumping the seq tells the rest of the pack the leader has begun.
const packHowl = { seq: 0 };

/** Soft radial glow for the halo sprites — same recipe as the waterfall mist. */
function makeGlowTexture(): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.25)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

interface WolfState {
  mode: "trot" | "howl";
  time: number; // clamped-dt performance clock (same base as the shot clock)
  stateStart: number;
  angle: number;
  step: number;
  lastSeq: number;
  lastPackSeq: number;
  chorusAt: number; // scheduled join time; Infinity = not scheduled
  breaths: number;
  nextAmbient: number;
}

function Wolf({
  index,
  radius,
  speed,
  phase,
  size,
  material,
  lanternMaterial,
  haloMaterial,
}: (typeof PACK)[number] & {
  index: number;
  material: MeshStandardMaterial;
  lanternMaterial: MeshStandardMaterial;
  haloMaterial: SpriteMaterial;
}) {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const neck = useRef<Group>(null);
  const head = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const legs = useRef<(Group | null)[]>([]);
  const knees = useRef<(Group | null)[]>([]);

  // The throat lantern flares with the cry — per-wolf material so one wolf's
  // howl doesn't light the whole pack's throats.
  const throatMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#04110c",
        roughness: 0.5,
        emissive: "#46ffc2",
        emissiveIntensity: 0,
      }),
    []
  );

  const st = useRef<WolfState>({
    mode: "trot",
    time: 0,
    stateStart: 0,
    angle: phase,
    step: phase * 3.7,
    lastSeq: 0,
    lastPackSeq: 0,
    chorusAt: Infinity,
    breaths: 0,
    nextAmbient: 20 + phase * 13,
  });

  const scratch = useRef({ headPos: new Vector3(), up: new Vector3(0, 0.9, 0.35) });

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const t = state.clock.elapsedTime; // cosmetic sways only
    const g = root.current;
    const s = st.current;
    if (!g || !body.current) return;
    s.time += dt;

    const darkness = 1 - dayness(useWorldClock.getState().phase);

    const startHowl = () => {
      s.mode = "howl";
      s.stateStart = s.time;
      s.breaths = 0;
      s.chorusAt = Infinity;
      if (index === 0) packHowl.seq++;
    };

    // --- Cues: the Observer directs the leader; the leader directs the pack.
    const dir = useDirection.getState();
    if (dir.seq !== s.lastSeq) {
      s.lastSeq = dir.seq;
      if (dir.cue?.kind === "wolfHowl" && dir.cue.index === index && s.mode !== "howl") {
        startHowl();
      }
    }
    if (index > 0 && packHowl.seq !== s.lastPackSeq) {
      s.lastPackSeq = packHowl.seq;
      // Stagger the joins so the chorus builds instead of landing as one note.
      s.chorusAt = s.time + HOWL.HOWL_AT + 0.9 * index - 0.4;
    }
    if (s.mode === "trot" && s.time >= s.chorusAt) startHowl();
    // Ambient howls only in the deep Dark, and never during a tour.
    if (s.mode === "trot" && !directionFlags.observing && darkness > 0.5 && s.time >= s.nextAmbient) {
      startHowl();
    }

    // --- Howl envelopes (pure functions of u, per the HOWL contract). --------
    let up = 0; // muzzle tipping back
    let cry = 0; // the held note — throat flare + tremor
    let moveFactor = 1;
    if (s.mode === "howl") {
      const u = s.time - s.stateStart;
      if (u >= HOWL.total) {
        s.mode = "trot";
        s.nextAmbient = s.time + 34 + ((index * 5.7 + Math.floor(s.time)) % 28);
      } else {
        const release = 1 - smooth(u, HOWL.howlEnd, HOWL.total);
        moveFactor = 1 - smooth(u, 0, HOWL.settle) + smooth(u, HOWL.howlEnd, HOWL.total);
        up = smooth(u, HOWL.settle, HOWL.muzzleUp) * release;
        cry = smooth(u, HOWL.HOWL_AT, HOWL.HOWL_AT + 0.4) * (1 - smooth(u, HOWL.howlEnd - 0.5, HOWL.howlEnd));

        // Breath climbing out of the cry, straight up into the aurora.
        if (s.breaths < 2 && u >= HOWL.HOWL_AT + s.breaths * 1.1 && head.current) {
          s.breaths++;
          head.current.getWorldPosition(scratch.current.headPos);
          emitBurst({
            kind: "vapor",
            origin: scratch.current.headPos,
            dir: scratch.current.up,
            count: 40,
            baseSpeed: 1.6,
            spread: 0.3,
            life: 2.2,
            size: 0.6,
          });
        }
      }
    }
    throatMaterial.emissiveIntensity = darkness * (0.4 + 3.4 * cry * (0.8 + 0.2 * Math.sin(t * 9)));

    // --- Locomotion: the patrol ring, breathing in and out around the den. ---
    s.angle += speed * dt * moveFactor;
    s.step += dt * 4.4 * moveFactor;
    const r = radius * (1 + 0.14 * Math.sin(t * 0.11 + phase * 2.3));
    const a = s.angle;
    const x = DEN.x + Math.cos(a) * r;
    const z = DEN.z + Math.sin(a) * r;
    g.position.set(x, sampleHeight(x, z), z);
    const dirX = -Math.sin(a) * Math.sign(speed);
    const dirZ = Math.cos(a) * Math.sign(speed);
    g.rotation.y = Math.atan2(dirX, dirZ);

    // --- Pose. ----------------------------------------------------------------
    const step = s.step;
    // Sits back on its haunches to howl: rump drops, chest lifts.
    body.current.rotation.x = -0.38 * up;
    body.current.position.y = 0.62 + 0.03 * Math.sin(2 * step) * moveFactor - 0.1 * up;
    body.current.rotation.z = 0.03 * Math.sin(step) * moveFactor;

    // Trot: diagonal pairs, quick and light.
    for (let i = 0; i < 4; i++) {
      const legPhase = i === 0 || i === 3 ? 0 : Math.PI; // diagonal pairing
      const swing = 0.55 * Math.sin(step + legPhase) * moveFactor;
      const l = legs.current[i];
      const k = knees.current[i];
      if (l && k) {
        const front = i < 2;
        l.rotation.x = swing * (1 - up) + (front ? -0.5 : 0.55) * up;
        k.rotation.x =
          Math.max(0, -Math.sin(step + legPhase - 0.5)) * 0.8 * moveFactor * (1 - up) +
          (front ? 0.25 : -0.3) * up;
      }
    }

    if (neck.current) {
      neck.current.rotation.x = 0.25 - 1.15 * up; // muzzle to the sky
      neck.current.rotation.y = Math.sin(t * 0.6 + phase) * 0.2 * (1 - up) * moveFactor;
    }
    if (head.current) {
      const tremor = cry * 0.04 * Math.sin(t * 27);
      head.current.rotation.x = -0.1 - 0.45 * up + tremor;
      // Jawless cry: the muzzle parts read comes from the throat flare instead.
    }
    if (tail.current) {
      tail.current.rotation.x = 0.5 + 0.35 * up + 0.12 * Math.sin(step * 0.5) * moveFactor;
    }

    // --- Track points for the Observer (pack leader only). -------------------
    if (index === 0) {
      setTrackPoint("wolf0", g.position);
      setTrackYaw("wolf0", g.rotation.y);
      if (head.current) {
        head.current.getWorldPosition(scratch.current.headPos);
        setTrackPoint("wolf0Head", scratch.current.headPos);
        setTrackYaw("wolf0Head", g.rotation.y);
      }
    }
  });

  const leg = (lx: number, zPos: number, i: number) => (
    <group key={i} ref={(el) => (legs.current[i] = el)} position={[lx, -0.05, zPos]}>
      <mesh material={material} position={[0, -0.18, 0]}>
        <capsuleGeometry args={[0.07, 0.3, 4, 8]} />
      </mesh>
      <group ref={(el) => (knees.current[i] = el)} position={[0, -0.36, 0]}>
        <mesh material={material} position={[0, -0.17, 0]}>
          <capsuleGeometry args={[0.05, 0.28, 4, 8]} />
        </mesh>
        <mesh material={material} position={[0, -0.33, 0.04]} scale={[0.08, 0.05, 0.13]}>
          <sphereGeometry args={[1, 8, 6]} />
        </mesh>
      </group>
    </group>
  );

  // Photophore rows: the "loose ring of small fires" read. Mirrored flanks,
  // shrinking toward the tail.
  const lanterns: [number, number, number, number][] = [];
  for (let i = 0; i < 4; i++) {
    const zi = 0.42 - i * 0.28;
    const li = 0.065 - i * 0.008;
    lanterns.push([0.19, 0.08 + 0.03 * Math.sin(i * 1.9), zi, li]);
    lanterns.push([-0.19, 0.08 + 0.03 * Math.sin(i * 1.9 + 1), zi, li]);
  }

  return (
    <group ref={root} scale={size * SCALE}>
      {/* Halo: at range, each wolf reads first as a small green fire moving
          on the ice — the canon read — long before the animal resolves. */}
      <sprite material={haloMaterial} position={[0, 0.7, 0]} scale={[2.6, 2.6, 1]} />
      <group ref={body} position={[0, 0.62, 0]}>
        {/* lean chest-deep body, tucked waist */}
        <mesh material={material} position={[0, 0.04, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.19, 0.5, 6, 12]} />
        </mesh>
        <mesh material={material} position={[0, 0.0, -0.28]} scale={[0.8, 0.85, 1]}>
          <sphereGeometry args={[0.18, 12, 10]} />
        </mesh>
        {/* flank photophores */}
        {lanterns.map(([lx, ly, lz, ls], i) => (
          <mesh key={i} material={lanternMaterial} position={[lx, ly, lz]}>
            <sphereGeometry args={[ls, 6, 5]} />
          </mesh>
        ))}
        {/* stern-light on the tail */}
        <group ref={tail} position={[0, 0.06, -0.44]} rotation={[0.5, 0, 0]}>
          <mesh material={material} position={[0, 0.02, -0.22]} rotation={[Math.PI / 2 - 0.25, 0, 0]}>
            <capsuleGeometry args={[0.06, 0.4, 4, 8]} />
          </mesh>
          <mesh material={lanternMaterial} position={[0, 0.09, -0.44]}>
            <sphereGeometry args={[0.045, 6, 5]} />
          </mesh>
        </group>

        {/* neck → wedge head, pricked ears, glowing eyes, throat lantern */}
        <group ref={neck} position={[0, 0.12, 0.52]} rotation={[0.25, 0, 0]}>
          <mesh material={material} position={[0, 0.03, 0.12]} rotation={[Math.PI / 2 - 0.3, 0, 0]}>
            <capsuleGeometry args={[0.11, 0.2, 4, 8]} />
          </mesh>
          <group ref={head} position={[0, 0.1, 0.3]} rotation={[-0.1, 0, 0]}>
            <mesh material={material} scale={[0.85, 0.85, 1]}>
              <sphereGeometry args={[0.13, 12, 8]} />
            </mesh>
            {/* tapered muzzle */}
            <mesh material={material} position={[0, -0.03, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
              <capsuleGeometry args={[0.06, 0.18, 4, 8]} />
            </mesh>
            <mesh material={material} position={[0, -0.01, 0.27]}>
              <sphereGeometry args={[0.04, 6, 5]} />
            </mesh>
            {/* pricked triangular ears */}
            <mesh material={material} position={[0.08, 0.15, -0.02]} rotation={[-0.2, 0, -0.25]}>
              <coneGeometry args={[0.05, 0.14, 5]} />
            </mesh>
            <mesh material={material} position={[-0.08, 0.15, -0.02]} rotation={[-0.2, 0, 0.25]}>
              <coneGeometry args={[0.05, 0.14, 5]} />
            </mesh>
            {/* eyes — the second thing you see after the flanks */}
            <mesh material={lanternMaterial} position={[0.07, 0.03, 0.1]}>
              <sphereGeometry args={[0.022, 6, 5]} />
            </mesh>
            <mesh material={lanternMaterial} position={[-0.07, 0.03, 0.1]}>
              <sphereGeometry args={[0.022, 6, 5]} />
            </mesh>
            {/* throat lantern — flares with the cry */}
            <mesh material={throatMaterial} position={[0, -0.09, 0.05]} scale={[0.8, 1.2, 1]}>
              <sphereGeometry args={[0.055, 8, 6]} />
            </mesh>
          </group>
        </group>

        {/* four quick legs */}
        {leg(0.14, 0.42, 0)}
        {leg(-0.14, 0.42, 1)}
        {leg(0.13, -0.32, 2)}
        {leg(-0.13, -0.32, 3)}
      </group>
    </group>
  );
}

export function LanternWolves() {
  const group = useRef<Group>(null);

  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#12171f", // near-black pelt — the animal is the dark part
        roughness: 0.85,
        emissive: "#16283a",
        emissiveIntensity: 0.3,
      }),
    []
  );
  const lanternMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#04110c",
        roughness: 0.5,
        emissive: "#46ffc2",
        emissiveIntensity: 1.7, // just over HDR — the desktop Bloom ignites these
      }),
    []
  );
  const haloMaterial = useMemo(
    () =>
      new SpriteMaterial({
        map: makeGlowTexture(),
        color: "#39e6a8",
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  useFrame((state) => {
    const darkness = 1 - dayness(useWorldClock.getState().phase);
    // Buried in the Bright (canon): the pack simply isn't there until the sun
    // is properly down. Photophores breathe slowly once it is.
    if (group.current) group.current.visible = darkness > 0.12;
    const breathe = 0.85 + 0.15 * Math.sin(state.clock.elapsedTime * 0.7);
    lanternMaterial.emissiveIntensity = (0.25 + 1.15 * darkness) * breathe;
    haloMaterial.opacity = 0.65 * darkness * breathe;
    material.emissiveIntensity = 0.15 + 0.25 * darkness;
  });

  return (
    <group ref={group}>
      {PACK.map((wolf, i) => (
        <Wolf
          key={i}
          index={i}
          {...wolf}
          material={material}
          lanternMaterial={lanternMaterial}
          haloMaterial={haloMaterial}
        />
      ))}
    </group>
  );
}
