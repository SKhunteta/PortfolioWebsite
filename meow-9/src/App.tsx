import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  DirectionalLight,
  HemisphereLight,
  MathUtils,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PointLight,
  TOUCH,
} from "three";

import { Room } from "./station/Room";
import { Window as Porthole } from "./station/Window";
import { Nebula } from "./station/Nebula";
import { Props } from "./station/Props";
import { Cats } from "./cats/Cats";
import { LaserPointer, useLaser } from "./interact/LaserPointer";
import { PetPointer } from "./interact/PetPointer";
import { AudioDriver } from "./audio/AudioDriver";
import { useSound } from "./audio/store";
import { ObserverMode, useObserver } from "./observer/ObserverMode";
import { PostFX } from "./fx/PostFX";
import { useGravity, selectG, gravityLabel } from "./world/GravityDial";
import { PALETTE, mix } from "./world/palettes";
import { INPUT_TOUCH, PROFILE, TIER, fovForAspect } from "./world/device";

/** Advances the GravityDial once per frame. Nothing else touches time. */
function DialDriver() {
  const tick = useGravity((s) => s.tick);
  useFrame((_, dt) => tick(Math.min(dt, 0.1)));
  return null;
}

/** Keeps the resting camera's FOV matched to the viewport. PROFILE.baseFov
 *  is authored for 16:9 — three.js FOV is VERTICAL, so unmodified it crops
 *  portrait phones to a keyhole. fovForAspect widens it below the reference
 *  aspect; re-runs on resize/rotation. While a tour runs the Observer owns
 *  the FOV (it applies the same compensation to its shots). */
function AdaptiveFov() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const observing = useObserver((s) => s.active);
  useEffect(() => {
    // Dev/test handle — lets the smoke harness project track points.
    (window as unknown as Record<string, unknown>).__meowCamera = camera;
    if (observing) return;
    const cam = camera as PerspectiveCamera;
    cam.fov = fovForAspect(PROFILE.baseFov, size.width / size.height);
    cam.updateProjectionMatrix();
  }, [camera, size, observing]);
  return null;
}

/** Dev-only perf readout (add ?perf to the URL): draw calls + triangles once
 *  a second. The budget alarm for new furniture is ~600 calls on phones. */
function DrawCallProbe() {
  const last = useRef(0);
  useFrame(({ gl, clock }) => {
    if (clock.elapsedTime - last.current < 1) return;
    last.current = clock.elapsedTime;
    console.info(`[meow-9] calls ${gl.info.render.calls} tris ${gl.info.render.triangles}`);
  });
  return null;
}
const WANT_PERF =
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("perf");

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
      // Dimmed ~8% overall for a slightly moodier, softer room.
      hemiRef.current.intensity = MathUtils.lerp(0.72, 1.06, g);
    }
    if (keyRef.current) {
      keyRef.current.color.copy(mix(PALETTE.keyDrift, PALETTE.keySpin, g));
      keyRef.current.intensity = MathUtils.lerp(0.78, 1.84, g);
    }
    const warm = MathUtils.lerp(1.8, 44, g);
    if (warmARef.current) warmARef.current.intensity = warm;
    if (warmBRef.current) warmBRef.current.intensity = warm * 0.85;
    if (coolRef.current) coolRef.current.intensity = MathUtils.lerp(18, 1.1, g);
  });

  return (
    <>
      <directionalLight
        ref={keyRef}
        castShadow
        position={[3, 4.6, 2]}
        shadow-mapSize={[PROFILE.shadowMapSize, PROFILE.shadowMapSize]}
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

/** Shared pill styling for every control. Touch input gets 44 px minimum hit
 *  targets (Apple/Android HIG) regardless of rendering tier. */
const PILL: CSSProperties = {
  font: "600 13px/1 ui-monospace, monospace",
  letterSpacing: 2,
  color: "#f2ecfa",
  background: "rgba(10, 8, 22, 0.55)",
  border: "1px solid rgba(242, 236, 250, 0.35)",
  borderRadius: 999,
  padding: "12px 20px",
  cursor: "pointer",
  backdropFilter: "blur(6px)",
  whiteSpace: "nowrap",
  ...(INPUT_TOUCH && {
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }),
};

/** The hero control: a scrub slider for the Gravity Dial, with an AUTO pill
 *  to hand control back to the slow station breath. Positioning is owned by
 *  BottomControls — phones stack it under the button cluster; tablets and
 *  desktops keep it bottom-left. */
function SliderRow() {
  const g = useGravity(selectG);
  const running = useGravity((s) => s.running);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        maxWidth: "calc(100vw - 32px)",
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
        className="meow-dial"
        min={0}
        max={1000}
        value={Math.round(g * 1000)}
        onChange={(e) => {
          const dial = useGravity.getState();
          dial.setRunning(false);
          dial.setG(Number(e.target.value) / 1000);
        }}
        style={{
          width: TIER === "phone" ? "min(58vw, 240px)" : "min(34vw, 220px)",
          cursor: "ew-resize",
        }}
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
          ...PILL,
          font: "600 12px/1 ui-monospace, monospace",
          letterSpacing: 1,
          padding: "8px 12px",
          background: running ? "rgba(94, 233, 255, 0.25)" : "rgba(10, 8, 22, 0.55)",
        }}
      >
        AUTO
      </button>
    </div>
  );
}

/** Observer Mode overlay: the shot-boundary fade + lower-third caption.
 *  (The button cluster lives in BottomControls.) */
function ObserverOverlay() {
  const active = useObserver((s) => s.active);
  const caption = useObserver((s) => s.caption);
  const sub = useObserver((s) => s.sub);
  const fade = useObserver((s) => s.fade);

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
      {/* Lower-third caption. Font clamps and the right inset lets long
          captions wrap in portrait instead of running off screen; on phones
          it rides higher to clear a possibly-wrapped button cluster. */}
      {active && (
        <div
          style={{
            position: "absolute",
            left: "calc(28px + env(safe-area-inset-left))",
            right: "calc(28px + env(safe-area-inset-right))",
            bottom: `calc(${TIER === "phone" ? "126px" : "84px"} + env(safe-area-inset-bottom))`,
            pointerEvents: "none",
            userSelect: "none",
            opacity: 1 - fade,
            zIndex: 6,
            color: "#f2ecfa",
            textShadow: "0 1px 8px rgba(0,0,0,0.7)",
            font: "600 13px/1.5 ui-monospace, monospace",
          }}
        >
          <div style={{ fontSize: "clamp(20px, 5vw, 30px)", letterSpacing: 5, fontWeight: 700 }}>
            {caption}
          </div>
          <div style={{ opacity: 0.75, letterSpacing: 1 }}>{sub}</div>
        </div>
      )}
    </>
  );
}

/** The button cluster: SOUND / LASER / OBSERVE (+ speed during tours). A
 *  wrapping flex row — on a 320 px phone the pills wrap to two rows instead
 *  of clipping (the old fixed row overflowed narrow screens). */
function ClusterRow() {
  const active = useObserver((s) => s.active);
  const speed = useObserver((s) => s.speed);
  const start = useObserver((s) => s.start);
  const stop = useObserver((s) => s.stop);
  const cycleSpeed = useObserver((s) => s.cycleSpeed);
  const laserArmed = useLaser((s) => s.armed);
  const muted = useSound((s) => s.muted);
  const toggleMute = useSound((s) => s.toggle);

  // Desktop affordances — every shortcut has a button twin for touch.
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

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        maxWidth: "calc(100vw - 16px)",
      }}
    >
      {/* Sound toggle — stays up during tours too (the hum swell through
          a spin-down shot is half the show). */}
      <button
        onClick={toggleMute}
        title={muted ? "Unmute the station" : "Mute the station"}
        style={{
          ...PILL,
          padding: "12px 16px",
          opacity: muted ? 0.65 : 1,
        }}
      >
        {muted ? "∅ SOUND" : "♪ SOUND"}
      </button>
      {/* Laser arm toggle, left of OBSERVE. Hidden during tours. */}
      {!active && (
        <button
          onClick={() => useLaser.getState().toggle()}
          title="Arm the laser pointer — drag to play with the cats"
          style={{
            ...PILL,
            background: laserArmed ? "rgba(255, 40, 80, 0.4)" : "rgba(10, 8, 22, 0.55)",
          }}
        >
          {laserArmed ? "● LASER" : "○ LASER"}
        </button>
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
        style={PILL}
      >
        {active ? "✕ EXIT" : "◉ OBSERVE"}
      </button>
      {/* Fast-forward, right of EXIT, only while observing. */}
      {active && (
        <button
          onClick={cycleSpeed}
          title="Speed up the tour (. key)"
          style={{
            ...PILL,
            padding: "12px 18px",
            letterSpacing: 1,
            background: speed > 1 ? "rgba(90, 130, 220, 0.55)" : "rgba(10, 8, 22, 0.55)",
          }}
        >
          {`⏩ ${speed}×`}
        </button>
      )}
    </div>
  );
}

/** Live viewport width — the bottom layout must re-decide on rotation. */
function useViewportWidth() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1920));
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return w;
}

/** Bottom control layout. Narrow viewports (all phones, tablets in
 *  portrait, skinny desktop windows) get ONE self-sizing column — cluster
 *  row over slider row — so nothing overlaps when the cluster wraps; the
 *  old layout hard-coded offsets and collided. Wide viewports keep the
 *  classic placement: cluster centered, slider bottom-left. The 1100 px
 *  break is the measured width where both fit side by side with air. */
function BottomControls() {
  const observing = useObserver((s) => s.active);
  const vw = useViewportWidth();
  const stacked = TIER === "phone" || vw < 1100;

  if (stacked) {
    return (
      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: "calc(16px + env(safe-area-inset-bottom))",
          zIndex: 7,
          display: "flex",
          flexDirection: "column-reverse", // slider under the cluster
          alignItems: "center",
          gap: 10,
          maxWidth: "calc(100vw - 16px)",
        }}
      >
        {!observing && <SliderRow />}
        <ClusterRow />
      </div>
    );
  }
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: "calc(20px + env(safe-area-inset-bottom))",
          zIndex: 7,
          maxWidth: "calc(100vw - 24px)",
        }}
      >
        <ClusterRow />
      </div>
      {!observing && (
        <div
          style={{
            position: "absolute",
            left: "calc(20px + env(safe-area-inset-left))",
            bottom: "calc(20px + env(safe-area-inset-bottom))",
            zIndex: 7,
          }}
        >
          <SliderRow />
        </div>
      )}
    </>
  );
}

// Dev tuning chrome (leva) loads lazily and ONLY in dev — Vite folds
// `import.meta.env.DEV` to `false` in prod builds, so the whole leva chunk
// is dropped from the shipped bundle.
const DevPanel = import.meta.env.DEV ? lazy(() => import("./dev/DevPanel")) : null;

export default function App() {
  const observing = useObserver((s) => s.active);
  const laserArmed = useLaser((s) => s.armed);

  return (
    <>
      <Canvas
        shadows={{ type: PCFSoftShadowMap }}
        dpr={PROFILE.dpr}
        camera={{ position: [4.6, 2.6, 4.6], fov: PROFILE.baseFov, near: 0.05, far: 200 }}
        // NOTE: no logarithmicDepthBuffer — it silently breaks depth testing
        // for raw ShaderMaterials (the nebula, holo panels), which don't get
        // three's log-depth patching.
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#05030a"]} />
        <DialDriver />
        <AdaptiveFov />
        {WANT_PERF && <DrawCallProbe />}
        <AudioDriver />
        <Lighting />
        <Nebula />
        <Room />
        <Porthole />
        <Props />
        <Cats />
        <LaserPointer />
        <PetPointer />
        <ObserverMode />
        <PostFX />
        <OrbitControls
          // Desktop: arming the laser hands the whole pointer to the dot.
          // Touch: controls stay live but one-finger orbit is disabled while
          // armed — one finger paints the laser, two fingers still reframe.
          enabled={!observing && (!laserArmed || INPUT_TOUCH)}
          touches={
            laserArmed && INPUT_TOUCH
              ? { ONE: -1 as TOUCH, TWO: TOUCH.DOLLY_ROTATE }
              : { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }
          }
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
      <BottomControls />
      <ObserverOverlay />
      {DevPanel && (
        <Suspense fallback={null}>
          <DevPanel />
        </Suspense>
      )}
    </>
  );
}
