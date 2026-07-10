import React, { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Billboard, OrbitControls, Text, useTexture } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import OverwhelmMeter from "../OverwhelmMeter";
import TermPopup from "../TermPopup";
import { STATES } from "../constants";
import {
  CAMERA,
  FIGURE,
  FIGURE_STAGE_SRCS,
  fogDensityFor,
  orbitSpeedFor,
  shakeAmplitudeFor,
  wordAppearanceFor,
  wordPlacementFor,
} from "./dioramaUtils";

// "Enter the room" — the meme as a 2.5D diorama. The slumped figure
// stays a sprite (a billboarded plane showing the current overwhelm
// stage); the buzzwords orbit him as real 3D text, so zooming the
// camera makes words pass between the lens and the chair.

// ——— Figure ———

// Radial feather so the sprite's #1E1E1E background melts into the
// scene instead of reading as a rectangle. Same idea as the 2D mode's
// CSS mask-image, drawn once into a canvas and used as an alphaMap.
const makeFeatherTexture = () => {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.55, "#ffffff");
  gradient.addColorStop(0.82, "#000000");
  gradient.addColorStop(1, "#000000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
};

// All six stages live as stacked planes; opacities ease between them
// so the figure crossfades as overwhelm moves, exactly like the 2D
// stage transition.
const FigureSprite = ({ figureStage }) => {
  const textures = useTexture(FIGURE_STAGE_SRCS);
  const materialRefs = useRef([]);
  const feather = useMemo(makeFeatherTexture, []);

  useEffect(() => {
    textures.forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
    });
    return () => feather.dispose();
  }, [textures, feather]);

  useFrame((_, delta) => {
    materialRefs.current.forEach((material, i) => {
      if (!material) return;
      const target = i + 1 === figureStage ? 0.95 : 0;
      material.opacity = THREE.MathUtils.damp(
        material.opacity,
        target,
        3,
        delta
      );
    });
  });

  return (
    <Billboard position={[0, FIGURE.CENTER_Y, 0]}>
      {textures.map((texture, i) => (
        <mesh key={FIGURE_STAGE_SRCS[i]} position={[0, 0, i * 0.002]}>
          <planeGeometry args={[FIGURE.WIDTH, FIGURE.HEIGHT]} />
          <meshBasicMaterial
            ref={(node) => {
              materialRefs.current[i] = node;
            }}
            map={texture}
            alphaMap={feather}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </Billboard>
  );
};

// ——— Words ———

// Self-hosted so troika never reaches for its CDN fallback font; DM Sans
// matches the rest of the page (font-sans-ele).
const WORD_FONT = "/fonts/dm-sans-600.ttf";

const TermWord = ({
  term,
  index,
  appearance,
  overwhelm,
  reducedMotion,
  onSelect,
}) => {
  const groupRef = useRef();
  const placement = useMemo(() => wordPlacementFor(index), [index]);
  // Angle is integrated frame-by-frame (not derived from elapsed time)
  // so orbit speed can change with overwhelm without the words jumping.
  const angleRef = useRef(placement.angle);

  useFrame((state, delta) => {
    if (!groupRef.current || reducedMotion) return;
    angleRef.current +=
      delta * orbitSpeedFor(overwhelm) * placement.speedFactor;
    const bob =
      Math.sin(state.clock.elapsedTime * 0.6 + placement.bobPhase) * 0.08;
    groupRef.current.position.set(
      Math.cos(angleRef.current) * placement.radius,
      placement.height + bob,
      Math.sin(angleRef.current) * placement.radius
    );
  });

  const setCursor = (cursor) => {
    document.body.style.cursor = cursor;
  };

  return (
    <group
      ref={groupRef}
      position={[
        Math.cos(placement.angle) * placement.radius,
        placement.height,
        Math.sin(placement.angle) * placement.radius,
      ]}
    >
      <Billboard>
        <Text
          font={WORD_FONT}
          fontSize={placement.fontSize}
          color={appearance.color}
          fillOpacity={appearance.opacity}
          outlineWidth={placement.fontSize * 0.06}
          outlineColor="#000000"
          outlineOpacity={appearance.opacity * 0.9}
          anchorX="center"
          anchorY="middle"
          onClick={
            appearance.interactive
              ? (event) => {
                  event.stopPropagation();
                  setCursor("auto");
                  onSelect(term.id);
                }
              : undefined
          }
          onPointerOver={
            appearance.interactive ? () => setCursor("pointer") : undefined
          }
          onPointerOut={
            appearance.interactive ? () => setCursor("auto") : undefined
          }
        >
          {`“${term.term}”`}
        </Text>
      </Billboard>
    </group>
  );
};

// ——— Atmosphere ———

// High overwhelm rattles the diorama itself (not the camera, which
// would fight OrbitControls' damping).
const ShakenWorld = ({ overwhelm, reducedMotion, children }) => {
  const groupRef = useRef();

  useFrame((state) => {
    if (!groupRef.current) return;
    const amplitude = reducedMotion ? 0 : shakeAmplitudeFor(overwhelm);
    const t = state.clock.elapsedTime;
    groupRef.current.position.x = amplitude * Math.sin(t * 23.7);
    groupRef.current.position.y = amplitude * 0.6 * Math.sin(t * 31.3 + 1.7);
  });

  return <group ref={groupRef}>{children}</group>;
};

const Room = ({ game, reducedMotion }) => {
  const { terms, answeredById, overwhelm, figureStage, selectTerm } = game;

  return (
    <>
      <color attach="background" args={["#1E1E1E"]} />
      <fogExp2 attach="fog" args={["#1E1E1E", fogDensityFor(overwhelm)]} />

      <ambientLight intensity={0.5} />
      {/* The single soft spotlight pooling on the chair. */}
      <spotLight
        position={[0.6, 5.2, 1.8]}
        angle={0.55}
        penumbra={0.9}
        intensity={60}
        decay={1.6}
        color="#fff7e8"
      />

      <ShakenWorld overwhelm={overwhelm} reducedMotion={reducedMotion}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[8, 48]} />
          <meshStandardMaterial color="#242424" roughness={0.95} />
        </mesh>

        <FigureSprite figureStage={figureStage} />

        {terms.map((term, index) => (
          <TermWord
            key={term.id}
            term={term}
            index={index}
            appearance={wordAppearanceFor(term, answeredById[term.id], overwhelm)}
            overwhelm={overwhelm}
            reducedMotion={reducedMotion}
            onSelect={selectTerm}
          />
        ))}
      </ShakenWorld>

      <OrbitControls
        makeDefault
        target={CAMERA.TARGET}
        minDistance={CAMERA.MIN_DISTANCE}
        maxDistance={CAMERA.MAX_DISTANCE}
        minPolarAngle={CAMERA.MIN_POLAR}
        maxPolarAngle={CAMERA.MAX_POLAR}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
};

// ——— Scene + DOM overlay ———

const DioramaScene = ({ game }) => {
  const reducedMotion = useReducedMotion();
  const {
    phase,
    terms,
    total,
    answers,
    answeredById,
    overwhelm,
    currentTerm,
    lastAnswer,
    selectTerm,
    closeTerm,
    answer,
    next,
  } = game;

  const revealing = phase === STATES.REVEAL;

  // Reset any lingering pointer cursor when the scene unmounts.
  useEffect(
    () => () => {
      document.body.style.cursor = "auto";
    },
    []
  );

  return (
    <section
      className="relative flex-1 flex flex-col w-full overflow-hidden"
      aria-label="The room — 3D diorama mode"
    >
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: CAMERA.START, fov: 45, near: 0.1, far: 40 }}
          dpr={[1, 1.75]}
        >
          <Suspense fallback={null}>
            <Room game={game} reducedMotion={reducedMotion} />
          </Suspense>
        </Canvas>
      </div>

      {/* DOM overlay: same HUD as the other modes. */}
      <div className="relative z-10 flex flex-col flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-8 pointer-events-none">
        <div className="flex items-center justify-between gap-4 pointer-events-auto">
          <OverwhelmMeter value={overwhelm} />
          <p className="text-hype-muted text-xs font-sans-ele shrink-0">
            {answers.length} / {total} answered
          </p>
        </div>

        <p className="mt-3 text-hype-muted text-xs font-sans-ele pointer-events-none">
          Drag to orbit · pinch or scroll to zoom · click a word to judge it
        </p>

        <div className="mt-auto pb-[env(safe-area-inset-bottom)] pointer-events-auto">
          {/* Keyboard & screen-reader route into the room: the same
              words as plain buttons, since WebGL text isn't focusable. */}
          <details className="inline-block rounded-md border border-hype-border bg-hype-surface/80 backdrop-blur px-3 py-2 max-w-full">
            <summary className="cursor-pointer text-hype-muted text-xs font-sans-ele focus:outline-none focus-visible:ring-2 focus-visible:ring-hype-text rounded">
              Keyboard &amp; screen-reader word list
            </summary>
            <ul className="mt-2 flex flex-wrap gap-1 max-h-40 overflow-y-auto">
              {terms.map((term) => {
                const done = Boolean(answeredById[term.id]);
                return (
                  <li key={term.id}>
                    <button
                      type="button"
                      disabled={done}
                      onClick={() => selectTerm(term.id)}
                      className={`min-h-[32px] px-2 py-1 rounded text-xs font-sans-ele transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-hype-text ${
                        done
                          ? "text-hype-muted/60 line-through"
                          : "text-hype-text hover:bg-hype-bg/70"
                      }`}
                    >
                      {term.term}
                    </button>
                  </li>
                );
              })}
            </ul>
          </details>
        </div>
      </div>

      {currentTerm && (
        <TermPopup
          term={currentTerm}
          revealing={revealing}
          answer={lastAnswer}
          isLast={answers.length >= total}
          onAnswer={answer}
          onClose={closeTerm}
          onNext={next}
          nextLabel="Back to the room"
        />
      )}
    </section>
  );
};

export default DioramaScene;
