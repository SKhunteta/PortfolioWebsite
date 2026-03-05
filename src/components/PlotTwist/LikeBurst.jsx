import React, { useMemo } from "react";
import { motion } from "framer-motion";

const BURST_COLORS = ["#EF4444", "#F87171", "#FB923C", "#FBBF24", "#F9A8D4", "#FFFFFF"];

const LikeBurst = ({ accentColor, isMilestone = false }) => {
  const particleCount = isMilestone ? 20 : 14;

  const particles = useMemo(
    () =>
      Array.from({ length: particleCount }, (_, i) => {
        const angle = (i / particleCount) * 360 + (Math.random() - 0.5) * 30;
        const rad = (angle * Math.PI) / 180;
        const distance = 50 + Math.random() * 80;
        return {
          id: i,
          x: Math.cos(rad) * distance,
          y: Math.sin(rad) * distance,
          size: 3 + Math.random() * 6,
          color: BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)],
          rotation: Math.random() * 720,
          delay: Math.random() * 0.1,
        };
      }),
    [particleCount]
  );

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {/* Ripple ring */}
      <div
        className="absolute w-12 h-12 rounded-full border-2 animate-pt-like-burst"
        style={{ borderColor: accentColor || "#EF4444" }}
      />

      {/* Particle burst */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{
            x: p.x,
            y: p.y,
            scale: 0,
            opacity: 0,
            rotate: p.rotation,
          }}
          transition={{
            duration: 0.7,
            delay: p.delay,
            ease: "easeOut",
          }}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
        />
      ))}

      {/* Screen flash */}
      <div
        className="fixed inset-0 animate-pt-like-flash pointer-events-none z-50"
        style={{ backgroundColor: accentColor || "#EF4444" }}
      />
    </div>
  );
};

export default LikeBurst;
