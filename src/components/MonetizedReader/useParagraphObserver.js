import { useCallback, useEffect, useRef } from "react";

/**
 * Observes paragraph elements and reports the one currently in the "reading
 * zone" (the middle band of the viewport). Each element registers via
 * registerParagraph(id) and must carry a matching data-pid attribute.
 */
export default function useParagraphObserver({ onParagraphEnter, enabled = true }) {
  const observerRef = useRef(null);
  const elementsRef = useRef(new Map());
  const enterRef = useRef(onParagraphEnter);
  enterRef.current = onParagraphEnter;

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === "undefined") {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.dataset.pid) {
            enterRef.current?.(entry.target.dataset.pid);
          }
        });
      },
      { threshold: 0.2, rootMargin: "-20% 0px -30% 0px" }
    );
    observerRef.current = observer;
    elementsRef.current.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [enabled]);

  const registerParagraph = useCallback(
    (id) => (el) => {
      const previous = elementsRef.current.get(id);
      if (previous && observerRef.current) {
        observerRef.current.unobserve(previous);
      }
      if (el) {
        elementsRef.current.set(id, el);
        observerRef.current?.observe(el);
      } else {
        elementsRef.current.delete(id);
      }
    },
    []
  );

  return { registerParagraph };
}
