import { useEffect, useRef, type CSSProperties } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Leva, useControls } from "leva";
import {
  DirectionalLight,
  HemisphereLight,
  MathUtils,
  PCFSoftShadowMap,
  PointLight,
} from "three";

import { Room } from "./station/Room";
import { Window as Porthole } from "./station/Window";
import { Nebula } from "./station/Nebula";
import { Props } from "./station/Props";
import { Cats } from "./cats/Cats";
import { LaserPointer, useLaser } from "./interact/LaserPointer";
import { ObserverMode, useObserver } from "./observer/ObserverMode";
import { PostFX } from "./fx/PostFX";
import { useGravity, selectG, gravityLabel } from "./world/GravityDial";
import { PALETTE, mix } from "./world/palettes";
import { MEOW } from "./world/config";
import { IS_TOUCH } from "./world/device";

/** Advances the GravityDial once per frame. Nothing else touches time. */
function DialDriver() {
  const tick = useGravity((s) => s.tick);
  useFrame((_, dt) => tick(Math.min(dt, 0.1)));
  return null;
}

/** The room's whole lighting mood rides the dial: warm lamps at full spin,
 *  neon-violet emergency glow in the drift. One soft key light gives the
 *  cats their shadows. */
function Lighting() {
  const keyRef = useRef<DirectionalLight>(null);
  const hemiRef = useRef<HemisphereLight>(null);
  const warmARef = useRef<PointLight>(null);
  const warmBRef = useRef<PointLight>(null);
  const coolRef = useRef<PointLight>(null);

  useFrame(() => {
    const g = useGravity.getState().g;
    if (hemiRef.current) {
      hemiRef.current.color.copy(mix(PALETTE.ambientDrift, PALETTE.ambientSpin, g));
      hemiRef.current.groundColor.copy(mix(PALETTE.groundDrift, PALETTE.groundSpin, g));
      // Higher floor so the cats stay readable even in the drift's low-g gloom.
      hemiRef.current.intensity = MathUtils.lerp(0.78, 1.15, g);
    }
    if (keyRef.current) {
      keyRef.current.color.copy(mix(PALETTE.keyDrift, PALETTE.keySpin, g));
      keyRef.current.intensity = MathUtils.lerp(0.85, 2.0, g);
    }
    const warm = MathUtils.lerp(2, 48, g);
    if (warmARef.current) warmARef.current.intensity = warm;
    if (warmBRef.current) warmBRef.current.intensity = warm * 0.85;
    if (coolRef.current) coolRef.current.intensity = MathUtils.lerp(20, 1.2, g);
  });

  return (
    <>
      <directionalLight
        ref={keyRef}
        castShadow
        position={[3, 4.6, 2]}
        shadow-mapSize={IS_TOUCH ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-bias={-0.0003}
        shadow-normalBias={0.04}
      />
      <hemisphereLight ref={hemiRef} />
      <pointLight ref={warmARef} color={PALETTE.lampWarm} position={[-3.5, 4.3, 1]} distance={12} decay={2} />
      <pointLight ref={warmBRef} color={PALETTE.lampWarm} position={[3.5, 4.3, -1]} distance={12} decay={2} />
      <pointLight ref={coolRef} color={PALETTE.lampCool} position={[0, 4.3, -2.5]} distance={13} decay={2} />
    </>
  );
}

/** Gravity readout, top-left. */
function GravityHUD() {
  const g = useGravity(selectG);
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(16px + env(safe-area-inset-top))",
        left: "calc(16px + env(safe-area-inset-left))",
        font: "600 13px/1.4 ui-monospace, monospace",
        color: "#f2ecfa",
        textShadow: "0 1px 3px rgba(0,0,0,0.6)",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <div style={{ fontSize: 16, letterSpacing: 1 }}>{gravityLabel(g)}</div>
      <div style={{ opacity: 0.7 }}>gravity {g.toFixed(2)} g</div>
    </div>
  );
}

/** The hero control: a scrub slider for the Gravity Dial (bottom-left), with
 *  an AUTO pill to hand control back to the slow station breath. */
function GravitySlider() {
  const g = useGravity(selectG);
  const running = useGravity((s) => s.running);
  const observing = useObserver((s) => s.active);
  if (observing) return null;

  const pill: CSSProperties = {
    font: "600 12px/1 ui-monospace, monospace",
    letterSpacing: 1,
    color: "#f2ecfa",
    background: "rgba(10, 8, 22, 0.55)",
    border: "1px solid rgba(242, 236, 250, 0.35)",
    borderRadius: 999,
    padding: "10px 14px",
    cursor: "pointer",
    backdropFilter: "blur(6px)",
  };

  return (
    <div
      style={{
        position: "absolute",
        left: "calc(20px + env(safe-area-inset-left))",
        bottom: "calc(20px + env(safe-area-inset-bottom))",
        zIndex: 7,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "rgba(10, 8, 22, 0.55)",
        border: "1px solid rgba(242, 236, 250, 0.25)",
        borderRadius: 999,
        padding: "10px 16px",
        backdropFilter: "blur(6px)",
      }}
    >
      <span
        style={{
          font: "600 11px/1 ui-monospace, monospace",
          letterSpacing: 2,
          color: "#f2ecfa",
          userSelect: "none",
        }}
      >
        0g
      </span>
      <input
        type="range"
        min={0}
        max={1000}
        value={Math.round(g * 1000)}
        onChange={(e) => {
          const dial = useGravity.getState();
          dial.setRunning(false);
          dial.setG(Number(e.target.value) / 1000);
        }}
        style={{ width: "min(34vw, 220px)", accentColor: "#ff5ecf", cursor: "ew-resize" }}
        aria-label="Gravity dial"
      />
      <span
        style={{
          font: "600 11px/1 ui-monospace, monospace",
          letterSpacing: 2,
          color: "#f2ecfa",
          userSelect: "none",
        }}
      >
        1g
      </span>
      <button
        onClick={() => useGravity.getState().setRunning(!running)}
        title="Let the station breathe the dial on its own"
        style={{
          ...pill,
          padding: "8px 12px",
          background: running ? "rgba(94, 233, 255, 0.25)" : "rgba(10, 8, 22, 0.55)",
        }}
      >
        AUTO
      </button>
    </div>
  );
}

/** Observer Mode chrome + the LASER arm toggle. */
function ObserverUI() {
  const active = useObserver((s) => s.active);
  const caption = useObserver((s) => s.caption);
  const sub = useObserver((s) => s.sub);
  const fade = useObserver((s) => s.fade);
  const speed = useObserver((s) => s.speed);
  const start = useObserver((s) => s.start);
  const stop = useObserver((s) => s.stop);
  const cycleSpeed = useObserver((s) => s.cycleSpeed);
  const laserArmed = useLaser((s) => s.armed);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stop();
        useLaser.getState().setArmed(false);
      }
      if (useObserver.getState().active && (e.key === "." || e.key === ">")) {
        cycleSpeed();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stop, cycleSpeed]);

  const pill: CSSProperties = {
    position: "absolute",
    bottom: "calc(20px + env(safe-area-inset-bottom))",
    zIndex: 7,
    font: "600 13px/1 ui-monospace, monospace",
    letterSpacing: 2,
    color: "#f2ecfa",
    background: "rgba(10, 8, 22, 0.55)",
    border: "1px solid rgba(242, 236, 250, 0.35)",
    borderRadius: 999,
    padding: "12px 22px",
    cursor: "pointer",
    backdropFilter: "blur(6px)",
  };

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
            color: "#f2ecfa",
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
        onClick={() => {
          if (active) stop();
          else {
            useLaser.getState().setArmed(false);
            start();
          }
        }}
        style={{ ...pill, left: "50%", transform: "translateX(-50%)" }}
      >
        {active ? "✕ EXIT" : "◉ OBSERVE"}
      </button>
      {/* Laser arm toggle, left of OBSERVE. Hidden during tours. */}
      {!active && (
        <button
          onClick={() => useLaser.getState().toggle()}
          title="Arm the laser pointer — drag to play with the cats"
          style={{
            ...pill,
            left: "50%",
            transform: "translateX(calc(-50% - 118px))",
            background: laserArmed ? "rgba(255, 40, 80, 0.4)" : "rgba(10, 8, 22, 0.55)",
          }}
        >
          {laserArmed ? "● LASER" : "○ LASER"}
        </button>
      )}
      {/* Fast-forward, right of EXIT, only while observing. */}
      {active && (
        <button
          onClick={cycleSpeed}
          title="Speed up the tour (. key)"
          style={{
            ...pill,
            left: "50%",
            transform: "translateX(calc(50% + 60px))",
            padding: "12px 18px",
            letterSpacing: 1,
            background: speed > 1 ? "rgba(90, 130, 220, 0.55)" : "rgba(10, 8, 22, 0.55)",
          }}
        >
          {`⏩ ${speed}×`}
        </button>
      )}
    </>
  );
}

/** Leva panel wired to the GravityDial — dev tuning next to the hero slider. */
function DialControls() {
  const setG = useGravity((s) => s.setG);
  const setRunning = useGravity((s) => s.setRunning);
  const setSecondsPerCycle = useGravity((s) => s.setSecondsPerCycle);

  useControls("Gravity Dial", {
    running: { value: true, onChange: setRunning },
    "seconds / cycle": {
      value: MEOW.secondsPerCycle,
      min: 20,
      max: 600,
      step: 5,
      onChange: setSecondsPerCycle,
    },
    scrub: {
      value: MEOW.startG,
      min: 0,
      max: 1,
      step: 0.001,
      onChange: (v: number) => {
        useGravity.getState().setRunning(false);
        setG(v);
      },
    },
  });
  return null;
}

export default function App() {
  const observing = useObserver((s) => s.active);
  const laserArmed = useLaser((s) => s.armed);

  return (
    <>
      <Canvas
        shadows={{ type: PCFSoftShadowMap }}
        dpr={IS_TOUCH ? [1, 1.5] : [1, 2]}
        camera={{ position: [4.6, 2.6, 4.6], fov: 55, near: 0.05, far: 200 }}
        // NOTE: no logarithmicDepthBuffer — it silently breaks depth testing
        // for raw ShaderMaterials (the nebula, holo panels), which don't get
        // three's log-depth patching.
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#05030a"]} />
        <DialDriver />
        <Lighting />
        <Nebula />
        <Room />
        <Porthole />
        <Props />
        <Cats />
        <LaserPointer />
        <ObserverMode />
        <PostFX />
        <OrbitControls
          enabled={!observing && !laserArmed}
          target={[0, 1.1, -0.5]}
          maxPolarAngle={Math.PI * 0.55}
          enableDamping
          dampingFactor={0.08}
          zoomToCursor
          minDistance={0.8}
          maxDistance={10}
        />
      </Canvas>
      <GravityHUD />
      <GravitySlider />
      <ObserverUI />
      <DialControls />
      <Leva collapsed={IS_TOUCH} hidden={observing} />
    </>
  );
}
