import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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

const AIChipLife = () => {
  const reducedMotion = useReducedMotion();
  const { setRef, activeIndex, crossProgress } = useScrollScenes(SCENES.length, CROSSING_INDEX);

  // Selections per scene id, and the accreting set of assembly parts.
  const [selections, setSelections] = useState({});
  const [parts, setParts] = useState(() => new Set());

  useEffect(() => {
    document.title = "The Life of an AI Chip · Built by Shrey";
  }, []);

  const handleSelect = (sceneId, optionId, part) => {
    setSelections((prev) => (prev[sceneId] === optionId ? prev : { ...prev, [sceneId]: optionId }));
    if (part) setParts((prev) => (prev.has(part) ? prev : new Set(prev).add(part)));
  };

  const activeScene = SCENES[activeIndex];

  // The chip detaches and ships when the crossing scene is reached.
  useEffect(() => {
    if (activeScene?.crossing) {
      setParts((prev) => (prev.has("crate") ? prev : new Set(prev).add("crate")));
    }
  }, [activeScene]);

  const focus = useMemo(() => projectFocus(activeScene.focus), [activeScene]);
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
            focus={focus}
            zoom={activeScene.zoom}
            crossing={activeScene.crossing}
            crossProgress={crossProgress}
            reducedMotion={reducedMotion}
            activeId={activeScene.id}
          />
          {/* Conceptual scenes: the map recedes behind a paper wash. */}
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{ backgroundColor: "#F3EFE8", opacity: conceptual ? 0.82 : 0.35 }}
          />
        </div>
      )}

      {/* Header. */}
      <header className="fixed top-0 inset-x-0 z-40 border-b backdrop-blur" style={{ borderColor: "rgba(0,0,0,0.06)", backgroundColor: "rgba(243,239,232,0.85)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="text-xs sm:text-sm transition-colors" style={{ fontFamily: SANS, color: "#6B6B6B" }}>
            ← Back to portfolio
          </Link>
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

      {/* Persistent chip-assembly widget. */}
      <AnimatePresence>
        {assemblyVisible && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
            className="fixed z-30 top-16 right-3 sm:right-6 rounded-xl border shadow-lg p-2"
            style={{ borderColor: "#E8E4DF", backgroundColor: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)" }}
          >
            <ChipAssembly parts={parts} reducedMotion={reducedMotion} shipped={shipped} compact />
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
