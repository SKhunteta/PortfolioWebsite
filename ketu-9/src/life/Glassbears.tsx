import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MathUtils, MeshPhysicalMaterial, Vector2, Vector3 } from "three";
import { sampleHeight } from "../terrain/heightfield";
import { POI } from "../world/locations";
import { IS_TOUCH } from "../world/device";
import { makeNoiseNormalMap } from "../fx/noiseTextures";
import { emitBurst } from "../fx/particles";
import { ROAR, directionFlags, setTrackPoint, setTrackYaw, useDirection } from "./direction";

// Glassbears — canon: transparent apex predators you read as heat-shimmer.
// The material still does the heavy lifting (full transmission + refractive
// thickness — a bear is visible mainly by the way it BENDS the ice behind it),
// but the silhouette is now real bear anatomy: shoulder hump as the highest
// point, back sloping to lower hindquarters, deep chest, a thick short neck
// carried LOW, long muzzle over a hinged jaw, two-segment legs on oversized
// paws. Because when a lens stands up on its hind legs and roars, you want to
// know it's a bear.
//
// Behavior: each bear runs a tiny FSM (amble ⇄ roar). The roar is a pure
// function of u = t - stateStart against the exported ROAR timeline in
// direction.ts, so the Observer director can choreograph close-ups exactly.

const BEARS = [
  { offsetX: 0, offsetZ: 0, radius: 14, speed: 0.055, phase: 0 },
  { offsetX: 26, offsetZ: -14, radius: 10, speed: -0.042, phase: 2.4 },
  { offsetX: -20, offsetZ: 18, radius: 12, speed: 0.048, phase: 4.2 },
];

const SCALE = 2.0; // shoulder height ~2.6 m — a big bear

const smooth = (u: number, a: number, b: number) => MathUtils.smoothstep(u, a, b);

/** Rest pitch of the neck (head carried low — the key bear read at distance). */
const NECK_REST = 0.5;
const HEAD_REST = -0.35; // counter-tilt so the muzzle rides level
const HOCK_REST = 0.25; // hind hock angles back

/** Breath pulses during the roar (seconds from cue). */
const VAPOR_PULSES = [2.75, 3.4, 4.1];

interface BearState {
  mode: "amble" | "roar";
  /** Integrated performance clock (clamped dt — the SAME time base as the
   *  Observer's shot clock, so cued choreography can't desynchronize when a
   *  frame hitches). All FSM timing runs on this, never on raw elapsedTime. */
  time: number;
  stateStart: number;
  angle: number; // integrated path angle — bears can stop without teleporting
  step: number; // integrated gait phase
  lastSeq: number;
  pulses: number; // vapor pulses fired this roar
  lastFall: number; // gait half-cycle of the last footfall puff
  nextAmbient: number; // next self-directed roar (outside Observer tours)
}

function Bear({
  index,
  material,
  offsetX,
  offsetZ,
  radius,
  speed,
  phase,
}: (typeof BEARS)[number] & { index: number; material: MeshPhysicalMaterial }) {
  const root = useRef<Group>(null);
  const hips = useRef<Group>(null);
  const neck = useRef<Group>(null);
  const head = useRef<Group>(null);
  const jaw = useRef<Group>(null);
  const frontShoulders = useRef<(Group | null)[]>([]);
  const frontElbows = useRef<(Group | null)[]>([]);
  const hindHips = useRef<(Group | null)[]>([]);
  const hindKnees = useRef<(Group | null)[]>([]);

  const st = useRef<BearState>({
    mode: "amble",
    time: 0,
    stateStart: 0,
    angle: phase,
    step: phase * 3.1,
    lastSeq: 0,
    pulses: 0,
    lastFall: -999,
    nextAmbient: 25 + phase * 11,
  });

  const scratch = useRef({ headPos: new Vector3(), headDir: new Vector3() });

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const t = state.clock.elapsedTime; // cosmetic sways only
    const g = root.current;
    const s = st.current;
    if (!g || !hips.current) return;
    s.time += dt;

    // --- Cues: the Observer director (or console) commands a roar. ----------
    const dir = useDirection.getState();
    if (dir.seq !== s.lastSeq) {
      s.lastSeq = dir.seq;
      if (dir.cue?.kind === "bearRoar" && dir.cue.index === index && s.mode !== "roar") {
        s.mode = "roar";
        s.stateStart = s.time;
        s.pulses = 0;
      }
    }
    // Ambient roars keep the ridge alive outside tours — never during one.
    if (s.mode === "amble" && !directionFlags.observing && s.time >= s.nextAmbient) {
      s.mode = "roar";
      s.stateStart = s.time;
      s.pulses = 0;
    }

    // --- Roar envelopes (all pure functions of u). ---------------------------
    let rear = 0;
    let jawOpen = 0;
    let headThrow = 0;
    let moveFactor = 1;
    if (s.mode === "roar") {
      const u = s.time - s.stateStart;
      if (u >= ROAR.total) {
        s.mode = "amble";
        s.nextAmbient = s.time + 45 + ((index * 7.3 + Math.floor(s.time)) % 40);
      } else {
        const release = 1 - smooth(u, ROAR.roarEnd + 0.3, ROAR.total);
        moveFactor = 1 - smooth(u, 0, ROAR.settle) + smooth(u, ROAR.roarEnd + 0.3, ROAR.total);
        rear = smooth(u, ROAR.settle, ROAR.rearEnd) * release;
        // Head throws back through the inhale, punches forward as the jaw opens.
        headThrow =
          (-0.3 * smooth(u, ROAR.rearEnd - 0.2, ROAR.inhaleEnd) +
            0.2 * smooth(u, ROAR.inhaleEnd, ROAR.jawOpen + 0.4)) *
          release;
        jawOpen =
          smooth(u, ROAR.jawOpen - 0.15, ROAR.jawOpen + 0.1) *
          (1 - smooth(u, ROAR.roarEnd, ROAR.roarEnd + 0.35));

        // Breath vapor — three pulses out of the open mouth, along the muzzle.
        if (s.pulses < VAPOR_PULSES.length && u >= VAPOR_PULSES[s.pulses]) {
          s.pulses++;
          if (head.current) {
            head.current.getWorldPosition(scratch.current.headPos);
            head.current.getWorldDirection(scratch.current.headDir);
            scratch.current.headPos.addScaledVector(scratch.current.headDir, 0.9 * SCALE);
            emitBurst({
              kind: "vapor",
              origin: scratch.current.headPos,
              dir: scratch.current.headDir,
              count: 70,
              baseSpeed: 2.2,
              spread: 0.4,
              life: 1.8,
              size: 0.9,
            });
          }
        }
      }
    }

    // --- Locomotion: integrated, so the bear stops in place to perform. ------
    s.angle += speed * dt * moveFactor;
    s.step += dt * 2.6 * moveFactor;
    const a = s.angle;
    const cx = POI.bearRidge.x + offsetX;
    const cz = POI.bearRidge.z + offsetZ;
    const x = cx + Math.cos(a) * radius;
    const z = cz + Math.sin(a) * radius;
    g.position.set(x, sampleHeight(x, z), z);
    const dirX = -Math.sin(a) * Math.sign(speed);
    const dirZ = Math.cos(a) * Math.sign(speed);
    g.rotation.y = Math.atan2(dirX, dirZ);

    // Footfall kick-up: each planted forepaw chips a little burst of ice
    // crystals off the bench. A transparent predator is visible mostly by
    // what it disturbs — the puffs sell both the weight and the presence.
    if (!IS_TOUCH && moveFactor > 0.5) {
      const fall = Math.floor((s.step - 0.7) / Math.PI);
      if (fall !== s.lastFall) {
        s.lastFall = fall;
        const side = fall % 2 === 0 ? 1 : -1;
        const fwdX = Math.sin(g.rotation.y);
        const fwdZ = Math.cos(g.rotation.y);
        scratch.current.headPos.set(
          x + fwdX * 0.8 + fwdZ * 0.85 * side,
          g.position.y + 0.12,
          z + fwdZ * 0.8 - fwdX * 0.85 * side
        );
        emitBurst({
          kind: "vapor", origin: scratch.current.headPos,
          count: 8, baseSpeed: 0.8, spread: 1, life: 1.0, size: 0.4,
        });
      }
    }

    // --- Pose: hips pivot lifts the whole front half for the rear-up. --------
    const step = s.step;
    hips.current.rotation.x = -0.62 * rear;
    // Pacing gait rolls the whole body away from the striding side — the
    // shambling side-to-side sway IS the bear-walk read at any distance.
    hips.current.rotation.z = 0.06 * Math.sin(step) * moveFactor * (1 - rear);
    hips.current.position.y = 0.98 + 0.03 * Math.sin(2 * step) * moveFactor;

    // Two-beat PACING gait (same-side legs swing together, hind leading the
    // front by a beat) — bears amble, they don't trot. Joints blend toward the
    // roar pose as `rear` rises.
    for (let i = 0; i < 2; i++) {
      const sideSign = i === 0 ? 1 : -1;
      const sidePhase = i === 0 ? 0 : Math.PI;
      const frontSwing = 0.42 * Math.sin(step + sidePhase) * moveFactor;
      const hindSwing = 0.42 * Math.sin(step + sidePhase + 0.55) * moveFactor;

      const shoulder = frontShoulders.current[i];
      const elbow = frontElbows.current[i];
      if (shoulder && elbow) {
        // Reared: front legs fold and dangle at the chest, paws tucked.
        shoulder.rotation.x = frontSwing * (1 - rear) - 1.15 * rear;
        shoulder.rotation.z = -0.12 * rear * sideSign;
        elbow.rotation.x =
          Math.max(0, -Math.sin(step + sidePhase - 0.6)) * 0.7 * moveFactor * (1 - rear) +
          1.3 * rear;
      }
      const hip = hindHips.current[i];
      const knee = hindKnees.current[i];
      if (hip && knee) {
        // Hind legs counter-rotate against the hips pivot to stay planted.
        hip.rotation.x = hindSwing * (1 - rear) + 0.62 * rear;
        knee.rotation.x =
          HOCK_REST +
          Math.max(0, -Math.sin(step + sidePhase - 0.05)) * 0.7 * moveFactor * (1 - rear) -
          0.2 * rear;
      }
    }

    // Neck: carried low on the amble, thrown up and back for the roar. The
    // head swings WITH the gait (counter to the body roll) plus a slow wander.
    if (neck.current) {
      neck.current.rotation.x = NECK_REST - 0.85 * rear;
      neck.current.rotation.y =
        (Math.sin(t * 0.4 + phase) * 0.25 + Math.sin(step) * 0.09) * (1 - rear) * moveFactor;
    }
    if (head.current) {
      const tremor = jawOpen * (0.05 * Math.sin(t * 31) + 0.03 * Math.sin(t * 17));
      head.current.rotation.x = HEAD_REST + headThrow + Math.sin(t * 0.9 + phase) * 0.06 * (1 - rear);
      head.current.rotation.z = tremor;
    }
    if (jaw.current) {
      jaw.current.rotation.x = jawOpen * (0.7 + 0.05 * Math.sin(t * 46));
    }

    // --- Track points for the Observer's anchored shots (hero bear only). ----
    if (index === 0) {
      setTrackPoint("bear0", g.position);
      setTrackYaw("bear0", g.rotation.y);
      if (head.current) {
        head.current.getWorldPosition(scratch.current.headPos);
        setTrackPoint("bear0Head", scratch.current.headPos);
        setTrackYaw("bear0Head", g.rotation.y);
      }
    }
  });

  return (
    <group ref={root} scale={SCALE}>
      <group ref={hips} position={[0, 0.98, -0.75]}>
        {/* hindquarters: a big rounded rump set LOWER than the shoulder */}
        <mesh material={material} position={[0, -0.02, -0.15]} scale={[0.9, 0.82, 1.05]}>
          <sphereGeometry args={[0.56, 20, 14]} />
        </mesh>
        {/* barrel — slopes up toward the withers */}
        <mesh material={material} position={[0, 0.08, 0.6]} rotation={[Math.PI / 2 + 0.14, 0, 0]}>
          <capsuleGeometry args={[0.5, 0.85, 6, 16]} />
        </mesh>
        {/* deep belly line — bears are heavy underneath */}
        <mesh material={material} position={[0, -0.14, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.4, 0.7, 6, 14]} />
        </mesh>
        {/* chest */}
        <mesh material={material} position={[0, 0.22, 1.12]} scale={[0.9, 1.0, 1.05]}>
          <sphereGeometry args={[0.52, 20, 14]} />
        </mesh>
        {/* the shoulder hump — highest point of the animal, the grizzly marker */}
        <mesh material={material} position={[0, 0.68, 1.0]} scale={[0.78, 0.85, 1.15]}>
          <sphereGeometry args={[0.4, 16, 12]} />
        </mesh>
        {/* stub tail */}
        <mesh material={material} position={[0, 0.14, -0.72]} scale={[1, 0.85, 1.1]}>
          <sphereGeometry args={[0.11, 10, 8]} />
        </mesh>

        {/* neck (thick, short, carried low) → head → hinged jaw */}
        <group ref={neck} position={[0, 0.42, 1.5]} rotation={[NECK_REST, 0, 0]}>
          <mesh material={material} position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[0.3, 0.4, 6, 12]} />
          </mesh>
          <group ref={head} position={[0, 0.02, 0.62]} rotation={[HEAD_REST, 0, 0]}>
            <mesh material={material} scale={[0.85, 0.9, 1.05]}>
              <sphereGeometry args={[0.3, 16, 12]} />
            </mesh>
            {/* domed forehead + brow ridge stepping down to the muzzle */}
            <mesh material={material} position={[0, 0.1, 0.12]} scale={[1, 0.8, 0.9]}>
              <sphereGeometry args={[0.2, 12, 10]} />
            </mesh>
            <mesh material={material} position={[0, 0.06, 0.28]} scale={[1.35, 0.55, 0.8]}>
              <sphereGeometry args={[0.13, 12, 8]} />
            </mesh>
            {/* long tapered muzzle + nose */}
            <mesh material={material} position={[0, -0.03, 0.42]} rotation={[Math.PI / 2, 0, 0]}>
              <capsuleGeometry args={[0.14, 0.36, 4, 10]} />
            </mesh>
            <mesh material={material} position={[0, 0.0, 0.64]} scale={[1, 0.85, 1]}>
              <sphereGeometry args={[0.08, 10, 8]} />
            </mesh>
            {/* cheeks */}
            <mesh material={material} position={[0.15, -0.1, 0.18]}>
              <sphereGeometry args={[0.145, 10, 8]} />
            </mesh>
            <mesh material={material} position={[-0.15, -0.1, 0.18]}>
              <sphereGeometry args={[0.145, 10, 8]} />
            </mesh>
            {/* small round ears, set wide on top of the skull */}
            <mesh material={material} position={[0.21, 0.26, -0.05]} scale={[1, 1.15, 0.55]}>
              <sphereGeometry args={[0.09, 10, 8]} />
            </mesh>
            <mesh material={material} position={[-0.21, 0.26, -0.05]} scale={[1, 1.15, 0.55]}>
              <sphereGeometry args={[0.09, 10, 8]} />
            </mesh>
            {/* jaw hinge under the skull */}
            <group ref={jaw} position={[0, -0.14, 0.1]}>
              <mesh material={material} position={[0, -0.03, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
                <capsuleGeometry args={[0.1, 0.36, 4, 10]} />
              </mesh>
              <mesh material={material} position={[0, -0.04, 0.5]}>
                <sphereGeometry args={[0.08, 10, 8]} />
              </mesh>
            </group>
          </group>
        </group>

        {/* front legs: thick columns — shoulder muscle → upper → elbow → shank
            + oversized paw. Bear legs are pillars, not sticks. */}
        {[0.44, -0.44].map((lx, i) => (
          <group key={`f${i}`} ref={(el) => (frontShoulders.current[i] = el)} position={[lx, 0.06, 1.12]}>
            <mesh material={material} position={[0, -0.06, 0]} scale={[0.85, 1.2, 1]}>
              <sphereGeometry args={[0.22, 12, 10]} />
            </mesh>
            <mesh material={material} position={[0, -0.26, 0]}>
              <capsuleGeometry args={[0.2, 0.42, 4, 10]} />
            </mesh>
            <group ref={(el) => (frontElbows.current[i] = el)} position={[0, -0.52, 0]}>
              <mesh material={material} position={[0, -0.24, 0]}>
                <capsuleGeometry args={[0.15, 0.4, 4, 10]} />
              </mesh>
              <mesh material={material} position={[0, -0.5, 0.06]} scale={[0.19, 0.09, 0.27]}>
                <sphereGeometry args={[1, 10, 8]} />
              </mesh>
            </group>
          </group>
        ))}

        {/* hind legs: massive haunches, hocks angled back, long flat feet
            (bears walk on their whole sole — the plantigrade read) */}
        {[0.42, -0.42].map((lx, i) => (
          <group key={`h${i}`} ref={(el) => (hindHips.current[i] = el)} position={[lx, 0.02, -0.08]}>
            <mesh material={material} position={[0, -0.04, -0.02]} scale={[0.8, 1.15, 1.1]}>
              <sphereGeometry args={[0.3, 14, 10]} />
            </mesh>
            <mesh material={material} position={[0, -0.24, 0.02]}>
              <capsuleGeometry args={[0.24, 0.4, 4, 10]} />
            </mesh>
            <group ref={(el) => (hindKnees.current[i] = el)} position={[0, -0.48, 0.02]} rotation={[HOCK_REST, 0, 0]}>
              <mesh material={material} position={[0, -0.24, 0]}>
                <capsuleGeometry args={[0.15, 0.4, 4, 10]} />
              </mesh>
              <mesh material={material} position={[0, -0.5, 0.08]} scale={[0.2, 0.09, 0.32]}>
                <sphereGeometry args={[1, 10, 8]} />
              </mesh>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

export function Glassbears() {
  const material = useMemo(() => {
    // Chiseled-ice surface detail: a tileable FBM normal map breaks the
    // refraction up so the bear reads as carved ice, not blown glass.
    const normalMap = makeNoiseNormalMap(256, 3, 1.4, 7);
    return IS_TOUCH
      ? // Mobile: transmission forces a second scene render — fake the glass
        // with plain transparency instead.
        new MeshPhysicalMaterial({
          transparent: true,
          opacity: 0.32,
          roughness: 0.15,
          color: "#dcecee",
          normalMap,
          normalScale: new Vector2(0.18, 0.18),
        })
      : new MeshPhysicalMaterial({
          transmission: 1.0,
          thickness: 2.5,
          roughness: 0.12,
          ior: 1.42,
          color: "#eef4f6",
          attenuationColor: "#bfe6e0",
          attenuationDistance: 6,
          transparent: true,
          normalMap,
          normalScale: new Vector2(0.18, 0.18),
          clearcoat: 1.0,
          clearcoatRoughness: 0.08,
          iridescence: 0.25,
          iridescenceIOR: 1.3,
        });
  }, []);

  return (
    <group>
      {BEARS.map((bear, i) => (
        <Bear key={i} index={i} {...bear} material={material} />
      ))}
    </group>
  );
}
