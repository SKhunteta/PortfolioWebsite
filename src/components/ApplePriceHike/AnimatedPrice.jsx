import React, { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
} from "framer-motion";

// A dollar figure that counts to its target when it changes. Honors
// prefers-reduced-motion by snapping. Kept dumb on purpose — it only renders
// whatever number it's handed.
const AnimatedPrice = ({ value, className, style }) => {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const display = useTransform(mv, (n) =>
    `$${Math.round(n).toLocaleString("en-US")}`
  );

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    });
    return controls.stop;
  }, [value, reduce, mv]);

  return <motion.span className={className} style={style}>{display}</motion.span>;
};

export default AnimatedPrice;
