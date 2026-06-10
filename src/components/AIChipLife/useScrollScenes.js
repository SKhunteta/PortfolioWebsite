import { useEffect, useRef, useState } from "react";

// Scene activation + per-scene progress, driven by scroll position.
// The active scene is the one whose vertical center is closest to the viewport
// center. `crossProgress` is how far the crossing scene has scrolled through
// the viewport (0..1), used to move the chip token across the Pacific.
const useScrollScenes = (count, crossingIndex) => {
  const sectionRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [crossProgress, setCrossProgress] = useState(0);

  const setRef = (i) => (el) => {
    sectionRefs.current[i] = el;
  };

  useEffect(() => {
    let frame = null;

    const measure = () => {
      frame = null;
      const viewportCenter = window.innerHeight / 2;
      let best = 0;
      let bestDist = Infinity;

      sectionRefs.current.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const dist = Math.abs(center - viewportCenter);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      setActiveIndex(best);

      const crossEl = sectionRefs.current[crossingIndex];
      if (crossEl) {
        const rect = crossEl.getBoundingClientRect();
        // 0 when the section's top hits the viewport bottom, 1 when its bottom
        // reaches the viewport top.
        const total = rect.height + window.innerHeight;
        const scrolled = window.innerHeight - rect.top;
        setCrossProgress(Math.max(0, Math.min(1, scrolled / total)));
      }
    };

    const onScroll = () => {
      if (frame == null) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame != null) cancelAnimationFrame(frame);
    };
  }, [count, crossingIndex]);

  return { setRef, activeIndex, crossProgress };
};

export default useScrollScenes;
