import { useEffect, useRef, useState } from "react";

// Scene activation + per-scene progress, driven by scroll position.
// The active scene is the one whose vertical center is closest to the viewport
// center. `crossProgress` is how far the crossing scene has scrolled through
// the viewport (0..1), used to move the chip token across the Pacific.
const useScrollScenes = (count, crossingIndex) => {
  const sectionRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [crossProgress, setCrossProgress] = useState(0);
  // Fractional scene position (e.g. 2.4 = 40% of the way from scene 3's center
  // to scene 4's center). Lets the map camera scrub with the scroll instead of
  // jumping when a scene activates.
  const [flow, setFlow] = useState(0);

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

      const centers = [];
      sectionRefs.current.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        centers[i] = center;
        const dist = Math.abs(center - viewportCenter);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      setActiveIndex(best);

      // Fractional position between consecutive scene centers, clamped to the
      // story's ends.
      let f = best;
      if (centers.length > 1) {
        if (viewportCenter <= centers[0]) {
          f = 0;
        } else if (viewportCenter >= centers[centers.length - 1]) {
          f = centers.length - 1;
        } else {
          for (let i = 0; i < centers.length - 1; i += 1) {
            if (viewportCenter >= centers[i] && viewportCenter <= centers[i + 1]) {
              const span = centers[i + 1] - centers[i];
              f = span > 0 ? i + (viewportCenter - centers[i]) / span : i;
              break;
            }
          }
        }
      }
      setFlow(f);

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

  return { setRef, activeIndex, crossProgress, flow };
};

export default useScrollScenes;
