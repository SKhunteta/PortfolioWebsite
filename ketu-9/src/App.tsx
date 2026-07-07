import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Leva, useControls, folder } from "leva";
import {
  Color,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  MathUtils,
  Object3D,
  PCFSoftShadowMap,
  Vector3,
} from "three";

import { Atmosphere } from "./sky/Atmosphere";
import { Terrain } from "./terrain/Terrain";
import { Waterfalls } from "./water/Waterfalls";
import { Ocean } from "./water/Ocean";
import { ParticleField } from "./fx/particles";
import { PostFX } from "./fx/PostFX";
import { sampleHeight } from "./terrain/heightfield";
import { Glassbears } from "./life/Glassbears";
import { Leviathans } from "./life/Leviathans";
import { SkyEagles } from "./life/SkyEagles";
import { ObserverMode, useObserver } from "./observer/ObserverMode";
import { useWorldClock, selectPhase } from "./world/WorldClock";
import { sunDirection, sunLight, dayness, seasonLabel } from "./world/sun";
import { PALETTE, mix } from "./world/palettes";
import { KETU } from "./world/config";

import { IS_TOUCH } from "./world/device";

/** Advances the WorldClock once per frame. Nothing else touches time. */
function ClockDriver() {
  const tick = useWorldClock((s) => s.tick);
  useFrame((_, dt) => tick(Math.min(dt, 0.1)));
  return null;
}

/** Sun-driven directional light + hemisphere fill + seasonal fog. The shadow
 *  frustum is a tight ortho box re-aimed every frame at a focus point ahead of
 *  the camera (snapped to 16 m steps so the map doesn't shimmer) — crisp soft
 *  shadows near the viewer instead of one mushy map over the whole world. */
function Lighting() {
  const { scene, camera } = useThree();
  const sunRef = useRef<DirectionalLight>(null);
  const hemiRef = useRef<HemisphereLight>(null);

  const fog = useMemo(() => new FogExp2("#a9c4d6", 0.00016), []);
  const fogColor = useMemo(() => new Color(), []);
  const skyColor = useMemo(() => new Color(), []);
  const groundColor = useMemo(() => new Color(), []);
  const sunTarget = useMemo(() => new Object3D(), []);
  const focus = useMemo(() => new Vector3(), []);
  const forward = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const phase = useWorldClock.getState().phase;
    const d = dayness(phase);
    const { color, intensity } = sunLight(phase);

    if (sunRef.current) {
      camera.getWorldDirection(forward);
      focus.copy(camera.position).addScaledVector(forward, 180);
      focus.x = Math.round(focus.x / 16) * 16;
      focus.z = Math.round(focus.z / 16) * 16;
      focus.y = Math.round(Math.max(0, sampleHeight(focus.x, focus.z)) / 16) * 16;
      sunTarget.position.copy(focus);
      sunRef.current.position.copy(focus).addScaledVector(sunDirection(phase), 2500);
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
      <directionalLight
        ref={sunRef}
        castShadow
        target={sunTarget}
        shadow-mapSize={IS_TOUCH ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-420}
        shadow-camera-right={420}
        shadow-camera-top={420}
        shadow-camera-bottom={-420}
        shadow-camera-near={1}
        shadow-camera-far={6000}
        shadow-bias={-0.0004}
        shadow-normalBias={2.5}
      />
      <primitive object={sunTarget} />
      <hemisphereLight ref={hemiRef} />
    </>
  );
}

/** Minimal season readout, top-left. Replace with SeasonHUD in Milestone 10. */
function SeasonHUD() {
  const phase = useWorldClock(selectPhase);
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(16px + env(safe-area-inset-top))",
        left: "calc(16px + env(safe-area-inset-left))",
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

/** Observer Mode chrome: start/stop button, cinematic captions, shot fades. */
function ObserverUI() {
  const active = useObserver((s) => s.active);
  const caption = useObserver((s) => s.caption);
  const sub = useObserver((s) => s.sub);
  const fade = useObserver((s) => s.fade);
  const start = useObserver((s) => s.start);
  const stop = useObserver((s) => s.stop);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stop]);

  return (
    <>
      {/* Shot-boundary fade */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#000",
          opacity: active ? fade : 0,
          pointerEvents: "none",
          zIndex: 5,
        }}
      />
      {/* Lower-third caption */}
      {active && (
        <div
          style={{
            position: "absolute",
            left: "calc(28px + env(safe-area-inset-left))",
            bottom: "calc(84px + env(safe-area-inset-bottom))",
            pointerEvents: "none",
            userSelect: "none",
            opacity: 1 - fade,
            zIndex: 6,
            color: "#e8eef6",
            textShadow: "0 1px 8px rgba(0,0,0,0.7)",
            font: "600 13px/1.5 ui-monospace, monospace",
          }}
        >
          <div style={{ fontSize: 30, letterSpacing: 5, fontWeight: 700 }}>{caption}</div>
          <div style={{ opacity: 0.75, letterSpacing: 1 }}>{sub}</div>
        </div>
      )}
      {/* The one button */}
      <button
        onClick={active ? stop : start}
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: "calc(20px + env(safe-area-inset-bottom))",
          zIndex: 7,
          font: "600 13px/1 ui-monospace, monospace",
          letterSpacing: 2,
          color: "#e8eef6",
          background: "rgba(8, 12, 24, 0.55)",
          border: "1px solid rgba(232, 238, 246, 0.35)",
          borderRadius: 999,
          padding: "12px 22px",
          cursor: "pointer",
          backdropFilter: "blur(6px)",
        }}
      >
        {active ? "✕ EXIT" : "◉ OBSERVE"}
      </button>
    </>
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
  const observing = useObserver((s) => s.active);
  const { sunIntensity, exposure } = useControls("Atmosphere", {
    render: folder({
      sunIntensity: { value: 22, min: 0, max: 60, step: 0.5 },
      exposure: { value: 1.1, min: 0.2, max: 3, step: 0.05 },
    }),
  });

  return (
    <>
      <Canvas
        shadows={{ type: PCFSoftShadowMap }}
        dpr={IS_TOUCH ? [1, 1.5] : [1, 2]}
        camera={{ position: [-450, 800, 2600], fov: 55, near: 1, far: 20000 }}
        // NOTE: no logarithmicDepthBuffer — it silently breaks depth testing
        // for raw ShaderMaterials (waterfalls, future aurora/rivers), which
        // don't get three's log-depth patching. 1..20000 m is fine without it.
        gl={{ antialias: true }}
      >
        <ClockDriver />
        <Atmosphere
          sunIntensity={sunIntensity}
          exposure={exposure}
          primarySteps={IS_TOUCH ? 10 : 16}
          lightSteps={IS_TOUCH ? 4 : 8}
        />
        <Lighting />
        <Terrain />
        <Ocean />
        <Waterfalls />
        <Glassbears />
        <Leviathans />
        <SkyEagles />
        <ParticleField />
        <ObserverMode />
        <PostFX />
        <OrbitControls
          enabled={!observing}
          target={[0, 30, 0]}
          maxPolarAngle={Math.PI * 0.52}
          enableDamping
          dampingFactor={0.08}
          // Fly-to-what-you-point-at: the wheel dollies toward the cursor and
          // drags the orbit target with it, so you can actually reach the
          // leviathan pool 4 km out (a fixed target caps zoom at the origin).
          zoomToCursor
          minDistance={4}
          maxDistance={9000}
        />
      </Canvas>
      <SeasonHUD />
      <ObserverUI />
      <ClockControls />
      <Leva collapsed={IS_TOUCH} hidden={observing} />
    </>
  );
}
