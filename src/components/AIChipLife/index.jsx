import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import ViewSourceLink from "../ViewSourceLink";
import WorldMap from "./WorldMap";
import Scene from "./Scene";
import ChipAssembly from "./ChipAssembly";
import SourcesFooter from "./SourcesFooter";
import useScrollScenes from "./useScrollScenes";
import { SCENES } from "./scenes";
import { projectFocus } from "./projection";

const SANS = '"DM Sans", system-ui, sans-serif';
const MONO = '"JetBrains Mono", "IBM Plex Mono", monospace';
const SERIF = '"DM Serif Display", Georgia, serif';

const CROSSING_INDEX = SCENES.findIndex((s) => s.crossing);

// Cumulative assembly parts present once each scene index is reached (used for
// the static reduced-motion diagrams).
const cumulativePartsThrough = (index) => {
  const set = new Set();
  for (let i = 0; i <= index; i += 1) {
    if (SCENES[i].part) set.add(SCENES[i].part);
  }
  return set;
};

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
};

// Per-scene effective zoom: phones in portrait see a narrower horizontal span
// at the same zoom (the map covers by height), so city scenes zoom in a touch
// more and the Pacific crossing pulls back to keep both coasts in frame.
const effectiveZoom = (scene, isMobile) => {
  if (!isMobile) return scene.zoom;
  return scene.crossing ? scene.zoom * 0.8 : scene.zoom * 1.25;
};

// Ease that dwells near scene centers so the camera rests on a place while the
// reader reads, then glides during the hand-off between sections.
const easeSegment = (t) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

const META_DESCRIPTION =
  "An interactive, sourced tour of the AI chip supply chain by Shreyans Khunteta: from design in Santa Clara through ASML, Zeiss, TSMC, HBM, and CoWoS to a data center in Quincy, Washington. Every decision has one live button. That is the point.";

const AIChipLife = () => {
  const reducedMotion = useReducedMotion();
  const { setRef, activeIndex, crossProgress, flow } = useScrollScenes(SCENES.length, CROSSING_INDEX);
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const isDesktop = !isMobile;

  // Selections per scene id, the accreting set of assembly parts, and every
  // locked-in guess (for the epilogue recap).
  const [selections, setSelections] = useState({});
  const [parts, setParts] = useState(() => new Set());
  const [guessEntries, setGuessEntries] = useState([]);
  const [assemblyOpen, setAssemblyOpen] = useState(false);

  // Route metadata: title, description, and structured data for the piece,
  // restored on unmount (SPA, so this is best-effort for JS-running crawlers).
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "The Life of an AI Chip";

    const meta = document.querySelector('meta[name="description"]');
    const prevDescription = meta ? meta.getAttribute("content") : null;
    if (meta) meta.setAttribute("content", META_DESCRIPTION);

    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = "ai-chip-jsonld";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "The Life of an AI Chip",
      description: META_DESCRIPTION,
      url: "https://builtbyshrey.com/ai-chip",
      image: "https://builtbyshrey.com/images/ai-chip-og.png",
      author: {
        "@type": "Person",
        name: "Shreyans Khunteta",
        url: "https://builtbyshrey.com",
      },
      about: ["semiconductor supply chain", "EUV lithography", "AI accelerators", "advanced packaging"],
    });
    document.head.appendChild(ld);

    return () => {
      document.title = prevTitle;
      if (meta && prevDescription != null) meta.setAttribute("content", prevDescription);
      ld.remove();
    };
  }, []);

  const handleSelect = (sceneId, optionId, part) => {
    setSelections((prev) => (prev[sceneId] === optionId ? prev : { ...prev, [sceneId]: optionId }));
    if (part) setParts((prev) => (prev.has(part) ? prev : new Set(prev).add(part)));
  };

  const handleGuessReveal = (entry) => {
    setGuessEntries((prev) => (prev.some((e) => e.factId === entry.factId) ? prev : [...prev, entry]));
  };

  const activeScene = SCENES[activeIndex];

  // The chip detaches and ships when the crossing scene is reached.
  useEffect(() => {
    if (activeScene?.crossing) {
      setParts((prev) => (prev.has("crate") ? prev : new Set(prev).add("crate")));
    }
  }, [activeScene]);

  // Camera scrubbed by scroll: interpolate focus and zoom between the scenes
  // adjacent to the fractional scroll position.
  const camera = useMemo(() => {
    const i0 = Math.max(0, Math.min(SCENES.length - 1, Math.floor(flow)));
    const i1 = Math.min(SCENES.length - 1, i0 + 1);
    const t = easeSegment(flow - i0);
    const a = projectFocus(SCENES[i0].focus);
    const b = projectFocus(SCENES[i1].focus);
    const za = effectiveZoom(SCENES[i0], isMobile);
    const zb = effectiveZoom(SCENES[i1], isMobile);
    return {
      focus: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
      zoom: za + (zb - za) * t,
    };
  }, [flow, isMobile]);

  const conceptual = activeScene.mapMode === "conceptual";

  // The assembly widget retires for the crossing (chip is on the map) and the
  // stillness scene. This withdrawal of interactivity is the point.
  const assemblyVisible = !reducedMotion && activeScene.id <= 6;
  const shipped = parts.has("crate");

  return (
    <div className="relative" style={{ backgroundColor: "#F3EFE8" }}>
      {/* Fixed map backdrop. */}
      {!reducedMotion && (
        <div className="fixed inset-0 z-0">
          <WorldMap
            focus={camera.focus}
            zoom={camera.zoom}
            crossing={activeScene.crossing}
            crossProgress={crossProgress}
            reducedMotion={reducedMotion}
            activeId={activeScene.id}
            scrubbed
          />
          {/* Conceptual scenes: the map recedes behind a paper wash. */}
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{ backgroundColor: "#F3EFE8", opacity: conceptual ? 0.82 : 0.35 }}
          />
        </div>
      )}

      {/* Header. */}
      <header
        className="fixed top-0 inset-x-0 z-40 border-b backdrop-blur"
        style={{
          borderColor: "rgba(0,0,0,0.06)",
          backgroundColor: "rgba(243,239,232,0.85)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link to="/" className="text-xs sm:text-sm transition-colors" style={{ fontFamily: SANS, color: "#6B6B6B" }}>
              ← Back to portfolio
            </Link>
            <ViewSourceLink
              dir="src/components/AIChipLife"
              className="text-xs hidden sm:inline-flex"
              style={{ fontFamily: MONO, color: "#9A9A9A" }}
            />
          </div>
          <div className="text-right">
            <span className="block text-xs sm:text-sm font-bold" style={{ fontFamily: SERIF, color: "#1A1A1A" }}>
              The Life of an AI Chip
            </span>
            <span className="block text-[9px] sm:text-[10px]" style={{ fontFamily: MONO, color: "#9A9A9A" }}>
              flagship class as of 2026: GB200-era accelerator
            </span>
          </div>
        </div>
        {/* Progress thread. */}
        <div className="h-0.5 w-full" style={{ backgroundColor: "rgba(0,0,0,0.05)" }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${((activeIndex + 1) / SCENES.length) * 100}%`, backgroundColor: "#1A1A1A" }}
          />
        </div>
      </header>

      {/* Persistent chip-assembly widget. Desktop: full diagram, vertically
          centered in the free right column. Mobile: a collapsed pill that
          expands on tap so it never fights the header for space. */}
      <AnimatePresence>
        {assemblyVisible && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
            className="fixed z-30 top-20 right-3 lg:top-1/2 lg:-translate-y-1/2 lg:right-10 xl:right-16 rounded-xl border shadow-lg"
            style={{ borderColor: "#E8E4DF", backgroundColor: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)" }}
          >
            {isDesktop ? (
              <div className="p-4">
                <ChipAssembly parts={parts} reducedMotion={reducedMotion} shipped={shipped} />
              </div>
            ) : assemblyOpen ? (
              <button
                type="button"
                onClick={() => setAssemblyOpen(false)}
                aria-expanded="true"
                aria-label="Collapse chip assembly"
                className="p-2 block"
              >
                <ChipAssembly parts={parts} reducedMotion={reducedMotion} shipped={shipped} compact />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAssemblyOpen(true)}
                aria-expanded="false"
                aria-label={`Expand chip assembly, ${parts.size} of 7 components`}
                className="px-3 py-2 flex items-center gap-2"
              >
                <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                  <rect x="3" y="3" width="10" height="10" rx="1.5" fill="#1A1A1A" />
                  <rect x="6" y="6" width="4" height="4" rx="0.5" fill="#5BC0BE" />
                </svg>
                <span className="text-[10px] tracking-widest uppercase" style={{ fontFamily: MONO, color: "#6B6B6B" }}>
                  {parts.size}/7
                </span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scenes. */}
      <main className="relative z-10 pt-12">
        {SCENES.map((scene, i) => (
          <div key={scene.id} ref={setRef(i)}>
            <Scene
              scene={scene}
              completed={!!selections[scene.id]}
              selectedId={selections[scene.id]}
              onSelect={handleSelect}
              onGuessReveal={handleGuessReveal}
              guessEntries={guessEntries}
              reducedMotion={reducedMotion}
              staticParts={reducedMotion ? cumulativePartsThrough(i) : null}
            />
          </div>
        ))}
      </main>

      <div className="relative z-10">
        <SourcesFooter />
      </div>
    </div>
  );
};

export default AIChipLife;
