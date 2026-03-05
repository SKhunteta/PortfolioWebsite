import React, { useMemo } from "react";

/**
 * Mood-reactive ambient background effects.
 * Pure CSS animations — no JS animation loops for performance.
 */

const RainEffect = () => {
  const streaks = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: `${(i / 18) * 100 + Math.random() * 5}%`,
        delay: `${Math.random() * 3}s`,
        duration: `${1.5 + Math.random() * 1.5}s`,
        opacity: 0.03 + Math.random() * 0.04,
        height: `${30 + Math.random() * 40}px`,
      })),
    []
  );

  return (
    <>
      {streaks.map((s) => (
        <div
          key={s.id}
          className="absolute w-px animate-pt-rain"
          style={{
            left: s.left,
            top: "-10%",
            height: s.height,
            background: `linear-gradient(to bottom, transparent, rgba(255,255,255,${s.opacity}))`,
            animationDelay: s.delay,
            animationDuration: s.duration,
          }}
        />
      ))}
    </>
  );
};

const FloatingParticles = ({ color = "255,255,255", count = 8, direction = "up" }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${10 + Math.random() * 80}%`,
        delay: `${Math.random() * 4}s`,
        duration: `${4 + Math.random() * 4}s`,
        size: `${2 + Math.random() * 3}px`,
        opacity: 0.04 + Math.random() * 0.06,
        sway: `${(Math.random() - 0.5) * 40}px`,
      })),
    [count]
  );

  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          className={direction === "up" ? "animate-pt-float-up" : "animate-pt-drift"}
          style={{
            position: "absolute",
            left: p.left,
            bottom: direction === "up" ? "-5%" : undefined,
            top: direction !== "up" ? `${20 + Math.random() * 60}%` : undefined,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            backgroundColor: `rgba(${color},${p.opacity})`,
            animationDelay: p.delay,
            animationDuration: p.duration,
            "--sway": p.sway,
          }}
        />
      ))}
    </>
  );
};

const VignettePulse = ({ intensity = "normal" }) => (
  <div
    className="absolute inset-0 animate-pt-vignette-pulse"
    style={{
      background:
        "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)",
      animationDuration: intensity === "strong" ? "3s" : "5s",
    }}
  />
);

const Flicker = () => (
  <div
    className="absolute inset-0 bg-black animate-pt-flicker"
    style={{ animationDuration: "3s" }}
  />
);

const ScanLines = () => (
  <div
    className="absolute inset-0 animate-pt-scanline opacity-[0.03]"
    style={{
      backgroundImage:
        "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)",
      backgroundSize: "200% 200%",
    }}
  />
);

const Shimmer = () => (
  <div
    className="absolute inset-0 overflow-hidden"
    style={{ opacity: 0.06 }}
  >
    <div
      className="absolute w-[200%] h-full animate-pt-shimmer"
      style={{
        background:
          "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)",
      }}
    />
  </div>
);

const FogDrift = () => (
  <div className="absolute inset-0 overflow-hidden">
    <div
      className="absolute inset-0 animate-pt-fog opacity-[0.04]"
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 20%, transparent 40%, rgba(255,255,255,0.2) 60%, transparent 80%)",
        backgroundSize: "200% 100%",
      }}
    />
  </div>
);

const GradientBlob = () => (
  <div className="absolute inset-0 overflow-hidden">
    <div
      className="absolute w-[60%] h-[60%] rounded-full blur-3xl animate-pt-morph opacity-[0.06]"
      style={{
        background: "radial-gradient(circle, rgba(139,92,246,0.5), rgba(6,182,212,0.3), transparent)",
        top: "20%",
        left: "20%",
      }}
    />
  </div>
);

const MOOD_EFFECTS = {
  melancholy: () => <RainEffect />,
  hopeful: () => <FloatingParticles color="255,220,150" count={8} direction="up" />,
  tense: () => <VignettePulse intensity="strong" />,
  whimsical: () => <FloatingParticles color="200,180,255" count={6} direction="drift" />,
  dark: () => (
    <>
      <Flicker />
      <VignettePulse />
    </>
  ),
  warm: () => <FloatingParticles color="255,180,80" count={5} direction="up" />,
  cozy: () => <FloatingParticles color="255,180,80" count={5} direction="up" />,
  surreal: () => <GradientBlob />,
  eerie: () => (
    <>
      <FogDrift />
      <VignettePulse />
    </>
  ),
  unsettling: () => (
    <>
      <FogDrift />
      <VignettePulse intensity="strong" />
    </>
  ),
  witty: () => <ScanLines />,
  wry: () => <ScanLines />,
  electric: () => <Shimmer />,
  bittersweet: () => (
    <>
      <FloatingParticles color="255,200,200" count={4} direction="up" />
      <VignettePulse />
    </>
  ),
};

const MoodEffect = ({ mood }) => {
  const EffectComponent = MOOD_EFFECTS[mood];
  if (!EffectComponent) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]">
      <EffectComponent />
    </div>
  );
};

export default MoodEffect;
