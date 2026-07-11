import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";

/**
 * Animates text appearing word-by-word or line-by-line
 * when the component scrolls into view. Only plays once.
 *
 * mode="word" — splits by spaces, 30ms stagger (good for premises)
 * mode="line" — splits by newlines, 120ms stagger (good for excerpts)
 */
const TypewriterText = ({ text, mode = "word", className, style }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasPlayed) {
          setIsVisible(true);
          setHasPlayed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasPlayed]);

  const segments = useMemo(() => {
    if (mode === "line") {
      return text.split("\n").filter((line) => line.length > 0);
    }
    return text.split(/(\s+)/);
  }, [text, mode]);

  const stagger = mode === "word" ? 0.025 : 0.1;

  return (
    <div ref={ref} className={className} style={style}>
      {segments.map((segment, i) => {
        // Whitespace segments rendered as-is
        if (mode === "word" && /^\s+$/.test(segment)) {
          return <span key={i}>{segment}</span>;
        }

        return mode === "line" ? (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={
              isVisible
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 6 }
            }
            transition={{
              delay: i * stagger,
              duration: 0.35,
              ease: "easeOut",
            }}
            className={i > 0 ? "mt-4" : ""}
          >
            {segment}
          </motion.p>
        ) : (
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={
              isVisible ? { opacity: 1 } : { opacity: 0 }
            }
            transition={{
              delay: i * stagger,
              duration: 0.15,
              ease: "easeOut",
            }}
          >
            {segment}
          </motion.span>
        );
      })}
    </div>
  );
};

export default TypewriterText;
