import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useControls, folder } from "leva";
import {
  Color,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  MathUtils,
} from "three";

import { Atmosphere } from "./sky/Atmosphere";
import { Terrain } from "./terrain/Terrain";
import { useWorldClock, selectPhase } from "./world/WorldClock";
import { sunDirection, sunLight, dayness, seasonLabel } from "./world/sun";
import { PALETTE, mix } from "./world/palettes";
import { KETU } from "./world/config";

/** Advances the WorldClock once per frame. Nothing else touches time. */
function ClockDriver() {
  const tick = useWorldClock((s) => s.tick);
  useFrame((_, dt) => tick(Math.min(dt, 0.1)));
  return null;
}

/** Sun-driven directional light + hemisphere fill + seasonal fog. */
function Lighting() {
  const { scene } = useThree();
  const sunRef = useRef<DirectionalLight>(null);
  const hemiRef = useRef<HemisphereLight>(null);

  const fog = useMemo(() => new FogExp2("#a9c4d6", 0.00016), []);
  const fogColor = useMemo(() => new Color(), []);
  const skyColor = useMemo(() => new Color(), []);
  const groundColor = useMemo(() => new Color(), []);

  useFrame(() => {
    const phase = useWorldClock.getState().phase;
    const d = dayness(phase);
    const { color, intensity } = sunLight(phase);

    if (sunRef.current) {
      sunRef.current.position.copy(sunDirection(phase).multiplyScalar(3000));
      sunRef.current.color.copy(color);
      sunRef.current.intensity = intensity;
    }
    if (hemiRef.current) {
      skyColor.copy(mix(PALETTE.ambientDark, PALETTE.ambientBright, d));
      groundColor.copy(mix(PALETTE.groundDark, PALETTE.groundBright, d));
      hemiRef.current.color.copy(skyColor);
      hemiRef.current.groundColor.copy(groundColor);
      hemiRef.current.intensity = MathUtils.lerp(0.25, 0.9, d);
    }

    // Aerial perspective: distant geometry dissolves into the horizon color.
    fogColor.copy(mix(PALETTE.fogDark, PALETTE.fogBright, d));
    fog.color.copy(fogColor);
    fog.density = MathUtils.lerp(0.00022, 0.00012, d);
    scene.fog = fog;
  });

  return (
    <>
      <directionalLight ref={sunRef} castShadow />
      <hemisphereLight ref={hemiRef} />
    </>
  );
}

/**
 * Placeholder sea surface at sea level so the drowned fjord valleys read as
 * water. Follows the camera so it never runs out. Replaced by the real Ocean
 * (waves, reflections, ember-run rivers) in Milestone 6.
 */
function OceanPlaceholder() {
  const seaColor = useMemo(() => new Color(), []);
  const matRef = useRef<any>(null);
  const meshRef = useRef<any>(null);

  useFrame(({ camera }) => {
    const d = dayness(useWorldClock.getState().phase);
    seaColor.copy(mix(PALETTE.seaDark, PALETTE.seaBright, d));
    if (matRef.current) matRef.current.color.copy(seaColor);
    if (meshRef.current) meshRef.current.position.set(camera.position.x, 0, camera.position.z);
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[60000, 60000, 1, 1]} />
      <meshStandardMaterial ref={matRef} roughness={0.35} metalness={0} transparent opacity={0.92} />
    </mesh>
  );
}

/** Minimal season readout, top-left. Replace with SeasonHUD in Milestone 10. */
function SeasonHUD() {
  const phase = useWorldClock(selectPhase);
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        font: "600 13px/1.4 ui-monospace, monospace",
        color: "#e8eef6",
        textShadow: "0 1px 3px rgba(0,0,0,0.6)",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <div style={{ fontSize: 16, letterSpacing: 1 }}>{seasonLabel(phase)}</div>
      <div style={{ opacity: 0.7 }}>phase {phase.toFixed(3)}</div>
    </div>
  );
}

/** Leva panel wired to the WorldClock — scrub the year, pause, change speed. */
function ClockControls() {
  const setPhase = useWorldClock((s) => s.setPhase);
  const setRunning = useWorldClock((s) => s.setRunning);
  const setSecondsPerYear = useWorldClock((s) => s.setSecondsPerYear);

  useControls("World Clock", {
    running: { value: true, onChange: setRunning },
    "seconds / year": {
      value: KETU.secondsPerYear,
      min: 20,
      max: 3000,
      step: 10,
      onChange: setSecondsPerYear,
    },
    scrub: {
      value: KETU.startPhase,
      min: 0,
      max: 0.999,
      step: 0.001,
      onChange: (v: number) => {
        useWorldClock.getState().setRunning(false);
        setPhase(v);
      },
    },
  });
  return null;
}

export default function App() {
  const { sunIntensity, exposure } = useControls("Atmosphere", {
    render: folder({
      sunIntensity: { value: 22, min: 0, max: 60, step: 0.5 },
      exposure: { value: 1.1, min: 0.2, max: 3, step: 0.05 },
    }),
  });

  return (
    <>
      <Canvas
        shadows
        camera={{ position: [-450, 800, 2600], fov: 55, near: 1, far: 20000 }}
        gl={{ antialias: true, logarithmicDepthBuffer: true }}
      >
        <ClockDriver />
        <Atmosphere sunIntensity={sunIntensity} exposure={exposure} />
        <Lighting />
        <Terrain />
        <OceanPlaceholder />
        <OrbitControls
          target={[0, 30, 0]}
          maxPolarAngle={Math.PI * 0.52}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
      <SeasonHUD />
      <ClockControls />
    </>
  );
}
