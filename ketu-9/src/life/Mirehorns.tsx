import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MathUtils, MeshStandardMaterial, Vector3 } from "three";
import { sampleHeight } from "../terrain/heightfield";
import { POI } from "../world/locations";
import { useWorldClock } from "../world/WorldClock";
import { dayness } from "../world/sun";
import { emitBurst } from "../fx/particles";
import { DRINK, directionFlags, setTrackPoint, setTrackYaw, useDirection } from "./direction";

// Mirehorns — Ketu-9's moose. House-tall waders that haunt the plunge pools
// of the meltwater falls, straining ember-run fry out of the churn. All the
// moose reads are here: stilt legs on a heavy barrel, a shoulder hump taller
// than the rump, a long drooping muzzle with a swinging dewlap, and broad
// palmate antlers — which on this world grow a photophore velvet that holds
// the aurora: bone in the Bright, a soft teal lantern in the Dark.
//
// Behavior: each bull runs a tiny FSM (wade ⇄ drink), same contract as the
// glassbear roar — the drink is a pure function of u = t - stateStart against
// the exported DRINK timeline in direction.ts, so the Observer director can
// choreograph the head-lift cascade to the frame. Placement is a deterministic
// mount-time scan for wading-depth shallows around the tour waterfall, so the
// herd survives geology retunes.

const SCALE = 2.0; // shoulder ~3.2 m — a bull you look up at

const smooth = (u: number, a: number, b: number) => MathUtils.smoothstep(u, a, b);

const NECK_REST = 0.35; // head carried forward-low off the hump
const HEAD_REST = -0.15;

interface MooseSpot {
  x: number;
  z: number;
}

const PROFILE_STEPS = 48;

/** The shore can bank 10 m inside a 6 m circle — a moose that "wanders in a
 *  circle" walks straight up the fjord wall (and drags any anchored camera
 *  with it). Shrink the wander radius per-heading until every point of the
 *  loop stays at wading depth: the loop hugs the waterline instead. */
function wadeProfile(home: MooseSpot, radius: number): Float32Array {
  const profile = new Float32Array(PROFILE_STEPS);
  for (let i = 0; i < PROFILE_STEPS; i++) {
    const a = (i / PROFILE_STEPS) * Math.PI * 2;
    let r = radius;
    while (r > 1.2 && sampleHeight(home.x + Math.cos(a) * r, home.z + Math.sin(a) * r) > -0.9) {
      r -= 0.6;
    }
    profile[i] = r;
  }
  return profile;
}

/** Ring-scan the plunge pool for wading-depth water (deterministic — no RNG). */
function findShallows(): MooseSpot[] {
  const fall = POI.waterfalls[1]; // the fall the tour visits
  const top = sampleHeight(fall.x, fall.z);
  let lip = 0;
  for (let d = 0; d <= 260; d += 4) {
    if (sampleHeight(fall.x + fall.dirX * d, fall.z + fall.dirZ * d) < top - 25) break;
    lip = d;
  }
  const bx = fall.x + fall.dirX * (lip + 84);
  const bz = fall.z + fall.dirZ * (lip + 84);

  const spots: MooseSpot[] = [];
  for (let r = 24; r <= 300 && spots.length < 3; r += 6) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 32) {
      const x = bx + Math.cos(a) * r;
      const z = bz + Math.sin(a) * r;
      const h = sampleHeight(x, z);
      // Belly-deep water AND deepening seaward of the spot. Belly-deep on
      // purpose: the LOD render mesh deviates a meter or two from this
      // analytic heightfield, so ankle-deep "shallows" can render as dry
      // seabed — at -1.5 m the bull is unambiguously standing IN the sea.
      // (The Observer also shoots the herd from over that open water.)
      const wadeable = h > -2.4 && h < -0.75;
      const openSea =
        sampleHeight(x + fall.dirX * 15, z + fall.dirZ * 15) < -2.2 &&
        sampleHeight(x + fall.dirX * 32, z + fall.dirZ * 32) < -5;
      if (wadeable && openSea && spots.every((s) => Math.hypot(s.x - x, s.z - z) > 14)) {
        spots.push({ x, z });
        if (spots.length >= 3) break;
      }
    }
  }
  // Geology safety net: if the pool ever silts up, stand them at the base.
  while (spots.length < 3) spots.push({ x: bx + spots.length * 18, z: bz });
  return spots;
}

const WANDER = [
  { radius: 6, speed: 0.05, phase: 0.4 },
  { radius: 7, speed: -0.04, phase: 2.6 },
  { radius: 5, speed: 0.045, phase: 4.9 },
];

interface MooseState {
  mode: "wade" | "drink";
  time: number; // clamped-dt performance clock (same base as the shot clock)
  stateStart: number;
  angle: number;
  step: number;
  lastSeq: number;
  lastFall: number;
  splashed: boolean; // head-lift cascade fired this drink
  drips: number;
  nextAmbient: number;
}

function Moose({
  index,
  home,
  radius,
  speed,
  phase,
  material,
  antlerMaterial,
}: {
  index: number;
  home: MooseSpot;
  radius: number;
  speed: number;
  phase: number;
  material: MeshStandardMaterial;
  antlerMaterial: MeshStandardMaterial;
}) {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const neck = useRef<Group>(null);
  const head = useRef<Group>(null);
  const frontLegs = useRef<(Group | null)[]>([]);
  const frontKnees = useRef<(Group | null)[]>([]);
  const hindLegs = useRef<(Group | null)[]>([]);
  const hindKnees = useRef<(Group | null)[]>([]);

  const profile = useMemo(() => wadeProfile(home, radius), [home, radius]);

  const st = useRef<MooseState>({
    mode: "wade",
    time: 0,
    stateStart: 0,
    angle: phase,
    step: phase * 2.7,
    lastSeq: 0,
    lastFall: -999,
    splashed: false,
    drips: 0,
    nextAmbient: 14 + phase * 9,
  });

  const scratch = useRef({ headPos: new Vector3(), up: new Vector3(0, 1, 0), foot: new Vector3() });

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const t = state.clock.elapsedTime; // cosmetic sways only
    const g = root.current;
    const s = st.current;
    if (!g || !body.current) return;
    s.time += dt;

    // --- Cues: the Observer director commands a drink. ----------------------
    const dir = useDirection.getState();
    if (dir.seq !== s.lastSeq) {
      s.lastSeq = dir.seq;
      if (dir.cue?.kind === "mooseDrink" && dir.cue.index === index && s.mode !== "drink") {
        s.mode = "drink";
        s.stateStart = s.time;
        s.splashed = false;
        s.drips = 0;
      }
    }
    // Ambient drinks keep the pool alive outside tours — never during one.
    if (s.mode === "wade" && !directionFlags.observing && s.time >= s.nextAmbient) {
      s.mode = "drink";
      s.stateStart = s.time;
      s.splashed = false;
      s.drips = 0;
    }

    // --- Drink envelopes (pure functions of u, per the DRINK contract). ------
    let dip = 0; // 0 = head up, 1 = muzzle underwater
    let lift = 0; // overshoot as the head throws back up
    let moveFactor = 1;
    if (s.mode === "drink") {
      const u = s.time - s.stateStart;
      if (u >= DRINK.total) {
        s.mode = "wade";
        s.nextAmbient = s.time + 26 + ((index * 6.1 + Math.floor(s.time)) % 22);
      } else {
        moveFactor = 1 - smooth(u, 0, DRINK.settle) + smooth(u, DRINK.liftEnd + 0.6, DRINK.total);
        dip = smooth(u, DRINK.settle, DRINK.dipEnd) * (1 - smooth(u, DRINK.LIFT_AT, DRINK.liftEnd));
        lift = smooth(u, DRINK.LIFT_AT, DRINK.LIFT_AT + 0.5) * (1 - smooth(u, DRINK.liftEnd, DRINK.total));

        // The payoff: the head comes up and the pool comes with it — a splash
        // off the muzzle and a sheet of drips off the antler palms.
        if (!s.splashed && u >= DRINK.LIFT_AT && head.current) {
          s.splashed = true;
          head.current.getWorldPosition(scratch.current.headPos);
          emitBurst({
            kind: "splash",
            origin: scratch.current.headPos,
            dir: scratch.current.up,
            count: 90,
            baseSpeed: 3.4,
            spread: 0.55,
            life: 1.2,
            size: 0.8,
          });
          emitBurst({
            kind: "sprayRing",
            origin: scratch.current.headPos,
            count: 60,
            baseSpeed: 2.4,
            spread: 1,
            life: 1.5,
            size: 0.7,
          });
        }
        // Two after-drips as the muzzle swings high.
        if (s.splashed && s.drips < 2 && u >= DRINK.LIFT_AT + 0.55 + s.drips * 0.5 && head.current) {
          s.drips++;
          head.current.getWorldPosition(scratch.current.headPos);
          emitBurst({
            kind: "splash",
            origin: scratch.current.headPos,
            count: 14,
            baseSpeed: 1.1,
            spread: 0.8,
            life: 0.8,
            size: 0.35,
          });
        }
      }
    }

    // --- Locomotion: slow wading loop hugging the waterline. -----------------
    s.angle += speed * dt * moveFactor;
    s.step += dt * 1.9 * moveFactor;
    const a = s.angle;
    // Interpolate the precomputed wading-radius profile at this heading.
    const pa = ((a / (Math.PI * 2)) % 1 + 1) % 1 * PROFILE_STEPS;
    const pi = Math.floor(pa);
    const r = MathUtils.lerp(profile[pi % PROFILE_STEPS], profile[(pi + 1) % PROFILE_STEPS], pa - pi);
    const x = home.x + Math.cos(a) * r;
    const z = home.z + Math.sin(a) * r;
    const groundY = sampleHeight(x, z);
    g.position.set(x, groundY, z);
    const dirX = -Math.sin(a) * Math.sign(speed);
    const dirZ = Math.cos(a) * Math.sign(speed);
    g.rotation.y = Math.atan2(dirX, dirZ);

    // Wading splashes: each footfall in standing water kicks a small ring.
    const inWater = groundY < 0.1;
    if (inWater && moveFactor > 0.5) {
      const fall = Math.floor((s.step - 0.6) / Math.PI);
      if (fall !== s.lastFall) {
        s.lastFall = fall;
        const side = fall % 2 === 0 ? 1 : -1;
        const fwdX = Math.sin(g.rotation.y);
        const fwdZ = Math.cos(g.rotation.y);
        scratch.current.foot.set(x + fwdX * 1.4 + fwdZ * 0.8 * side, 0.05, z + fwdZ * 1.4 - fwdX * 0.8 * side);
        emitBurst({
          kind: "sprayRing",
          origin: scratch.current.foot,
          count: 10,
          baseSpeed: 1.0,
          spread: 1,
          life: 0.9,
          size: 0.35,
        });
      }
    }

    // --- Pose. The whole front end reaches down for the drink: the body
    // pitches over the front legs while the neck unfolds toward the water.
    const step = s.step;
    body.current.rotation.x = 0.3 * dip - 0.06 * lift;
    body.current.rotation.z = 0.045 * Math.sin(step) * moveFactor;
    body.current.position.y = 1.62 + 0.025 * Math.sin(2 * step) * moveFactor - 0.16 * dip;

    // High-stepping wading gait — the stilt-leg read. Diagonal pairs.
    for (let i = 0; i < 2; i++) {
      const sidePhase = i === 0 ? 0 : Math.PI;
      const frontSwing = 0.5 * Math.sin(step + sidePhase) * moveFactor;
      const hindSwing = 0.5 * Math.sin(step + sidePhase + Math.PI) * moveFactor;
      const fl = frontLegs.current[i];
      const fk = frontKnees.current[i];
      if (fl && fk) {
        fl.rotation.x = frontSwing - 0.24 * dip; // front legs brace back on the dip
        fk.rotation.x = Math.max(0, -Math.sin(step + sidePhase - 0.5)) * 0.9 * moveFactor;
      }
      const hl = hindLegs.current[i];
      const hk = hindKnees.current[i];
      if (hl && hk) {
        hl.rotation.x = hindSwing + 0.1 * dip;
        hk.rotation.x = Math.max(0, -Math.sin(step + sidePhase + Math.PI - 0.5)) * 0.9 * moveFactor;
      }
    }

    // Neck: rest carry → deep dip → thrown-back lift, with a slow wander sway.
    if (neck.current) {
      neck.current.rotation.x =
        NECK_REST + 1.3 * dip - 0.55 * lift + Math.sin(t * 0.5 + phase) * 0.05 * (1 - dip);
      neck.current.rotation.y = Math.sin(t * 0.33 + phase * 2) * 0.16 * (1 - dip) * moveFactor;
    }
    if (head.current) {
      // Muzzle follows the water going down, shakes off coming up.
      head.current.rotation.x = HEAD_REST + 0.35 * dip - 0.25 * lift;
      head.current.rotation.z = lift * 0.18 * Math.sin(t * 21);
    }

    // --- Track points for the Observer (hero bull only). ---------------------
    if (index === 0) {
      setTrackPoint("moose0", g.position);
      setTrackYaw("moose0", g.rotation.y);
      if (head.current) {
        head.current.getWorldPosition(scratch.current.headPos);
        setTrackPoint("moose0Head", scratch.current.headPos);
        setTrackYaw("moose0Head", g.rotation.y);
      }
    }
  });

  // Legs: stilt-long two-segment columns — the moose read at any distance.
  const leg = (
    lx: number,
    zPos: number,
    refs: React.MutableRefObject<(Group | null)[]>,
    kneeRefs: React.MutableRefObject<(Group | null)[]>,
    i: number
  ) => (
    <group key={`${zPos}-${i}`} ref={(el) => (refs.current[i] = el)} position={[lx, -0.25, zPos]}>
      <mesh material={material} position={[0, -0.32, 0]}>
        <capsuleGeometry args={[0.13, 0.55, 4, 8]} />
      </mesh>
      <group ref={(el) => (kneeRefs.current[i] = el)} position={[0, -0.68, 0]}>
        <mesh material={material} position={[0, -0.36, 0]}>
          <capsuleGeometry args={[0.09, 0.62, 4, 8]} />
        </mesh>
        {/* broad splayed hoof — bog-walker feet */}
        <mesh material={material} position={[0, -0.72, 0.05]} scale={[0.16, 0.07, 0.22]}>
          <sphereGeometry args={[1, 8, 6]} />
        </mesh>
      </group>
    </group>
  );

  /** One palmate antler: a tilted shovel-palm with a comb of tines. */
  const antler = (side: 1 | -1) => (
    <group position={[side * 0.16, 0.28, -0.05]} rotation={[-0.5, side * 0.5, side * 0.9]}>
      {/* beam from the skull out to the palm */}
      <mesh material={antlerMaterial} position={[side * 0.18, 0.06, 0]} rotation={[0, 0, side * -0.5]}>
        <capsuleGeometry args={[0.045, 0.3, 4, 8]} />
      </mesh>
      {/* the palm — a broad flattened shovel */}
      <mesh material={antlerMaterial} position={[side * 0.48, 0.16, 0]} scale={[0.34, 0.1, 0.5]}>
        <sphereGeometry args={[1, 12, 8]} />
      </mesh>
      {/* tines combing off the palm's leading edge */}
      {[-0.32, -0.12, 0.08, 0.28].map((tz, ti) => (
        <mesh
          key={ti}
          material={antlerMaterial}
          position={[side * (0.52 + ti * 0.03), 0.26, tz]}
          rotation={[tz * -0.5, 0, side * -0.35]}
        >
          <coneGeometry args={[0.035, 0.3 + 0.1 * Math.sin(ti * 2.1), 6]} />
        </mesh>
      ))}
    </group>
  );

  return (
    <group ref={root} scale={SCALE}>
      <group ref={body} position={[0, 1.62, 0]}>
        {/* barrel — deep-chested, slung between the stilts */}
        <mesh material={material} position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.44, 0.95, 6, 14]} />
        </mesh>
        {/* the shoulder hump — taller than the rump, the moose silhouette */}
        <mesh material={material} position={[0, 0.36, 0.52]} scale={[0.72, 0.85, 1.1]}>
          <sphereGeometry args={[0.36, 16, 12]} />
        </mesh>
        {/* sloped hindquarters */}
        <mesh material={material} position={[0, 0.06, -0.52]} scale={[0.85, 0.8, 0.95]}>
          <sphereGeometry args={[0.4, 16, 12]} />
        </mesh>
        {/* stub tail */}
        <mesh material={material} position={[0, 0.18, -0.86]} scale={[1, 0.8, 1.2]}>
          <sphereGeometry args={[0.08, 8, 6]} />
        </mesh>

        {/* neck (short, powerful, off the top of the hump) → drooping head */}
        <group ref={neck} position={[0, 0.42, 0.86]} rotation={[NECK_REST, 0, 0]}>
          <mesh material={material} position={[0, 0.05, 0.24]} rotation={[Math.PI / 2 - 0.4, 0, 0]}>
            <capsuleGeometry args={[0.19, 0.42, 4, 10]} />
          </mesh>
          <group ref={head} position={[0, 0.22, 0.52]} rotation={[HEAD_REST, 0, 0]}>
            {/* skull */}
            <mesh material={material} scale={[0.8, 0.85, 1.1]}>
              <sphereGeometry args={[0.2, 14, 10]} />
            </mesh>
            {/* the long drooping muzzle — angled down, the moose face */}
            <mesh material={material} position={[0, -0.12, 0.3]} rotation={[Math.PI / 2 + 0.45, 0, 0]}>
              <capsuleGeometry args={[0.13, 0.4, 4, 10]} />
            </mesh>
            {/* bulbous overhanging nose */}
            <mesh material={material} position={[0, -0.26, 0.44]} scale={[1, 0.85, 1.15]}>
              <sphereGeometry args={[0.12, 10, 8]} />
            </mesh>
            {/* long mule ears */}
            <mesh material={material} position={[0.16, 0.2, -0.08]} rotation={[0, 0, -0.5]} scale={[0.5, 1.4, 0.3]}>
              <sphereGeometry args={[0.11, 8, 6]} />
            </mesh>
            <mesh material={material} position={[-0.16, 0.2, -0.08]} rotation={[0, 0, 0.5]} scale={[0.5, 1.4, 0.3]}>
              <sphereGeometry args={[0.11, 8, 6]} />
            </mesh>
            {antler(1)}
            {antler(-1)}
          </group>
          {/* dewlap — the bell, swinging under the throat */}
          <mesh material={material} position={[0, -0.16, 0.34]} rotation={[0.5, 0, 0]} scale={[0.4, 1.5, 0.5]}>
            <sphereGeometry args={[0.11, 8, 6]} />
          </mesh>
        </group>

        {/* stilt legs — front pair hung off the hump, hind off the rump */}
        {[0.3, -0.3].map((lx, i) => leg(lx, 0.62, frontLegs, frontKnees, i))}
        {[0.28, -0.28].map((lx, i) => leg(lx, -0.5, hindLegs, hindKnees, i))}
      </group>
    </group>
  );
}

export function Mirehorns() {
  const spots = useMemo(findShallows, []);

  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#5a4530", // wet umber pelt
        roughness: 0.85,
        metalness: 0.0,
        // Faint warm lift (same trick as the stormwings' sheen) so the bull
        // never collapses to a black cutout down in the gorge shade.
        emissive: "#33221a",
        emissiveIntensity: 0.55,
      }),
    []
  );
  const antlerMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#cbbca4", // weathered bone
        roughness: 0.55,
        emissive: "#2fe2a8", // photophore velvet — holds the aurora
        emissiveIntensity: 0.1,
      }),
    []
  );

  useFrame(() => {
    // Bone in the Bright; in the Dark the velvet charges into a soft lantern
    // (>1 rides into HDR so the desktop Bloom pass ignites the palms).
    const d = dayness(useWorldClock.getState().phase);
    antlerMaterial.emissiveIntensity = 0.02 + 1.9 * Math.pow(1 - d, 1.5);
  });

  return (
    <group>
      {spots.map((home, i) => (
        <Moose
          key={i}
          index={i}
          home={home}
          material={material}
          antlerMaterial={antlerMaterial}
          {...WANDER[i]}
        />
      ))}
    </group>
  );
}
