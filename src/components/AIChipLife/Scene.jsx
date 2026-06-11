import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ForcedChoice from "./ForcedChoice";
import GuessTheNumber from "./GuessTheNumber";
import StatCard from "./StatCard";
import ChipAssembly from "./ChipAssembly";
import RecapCard from "./RecapCard";
import { getFact } from "./facts";

const SANS = '"DM Sans", system-ui, sans-serif';
const MONO = '"JetBrains Mono", "IBM Plex Mono", monospace';
const SERIF = '"DM Serif Display", Georgia, serif';

const Scene = ({ scene, completed, selectedId, onSelect, onGuessReveal, guessEntries, reducedMotion, staticParts }) => {
  // A choice scene reveals its turn + flips its stat cards once the (only)
  // option is chosen. Scenes without a choice show everything when reached.
  const resolved = reducedMotion || !scene.choice || completed;
  const dark = scene.still || scene.epilogue;

  // Once the facts are showing, let the reader minimize the whole block — the
  // guess reveal *and* the stack of stat cards — down to its headline so they
  // aren't scrolling past a wall of cards on a phone. The reduced-motion/linear
  // article keeps everything open (no scroll-driven reveal to manage there).
  const [factsCollapsed, setFactsCollapsed] = useState(false);
  const hasFactsBlock = !!scene.guess || (scene.facts && scene.facts.length > 0);
  const canMinimize = !reducedMotion && resolved && hasFactsBlock;

  return (
    <section
      id={scene.slug}
      data-scene={scene.id}
      className="relative min-h-screen min-h-[100dvh] flex items-center justify-center lg:justify-start px-4 sm:px-6 lg:px-16 xl:px-24 py-20 scroll-mt-16"
    >
      <div
        className="relative w-full max-w-md lg:max-w-lg rounded-2xl border shadow-xl"
        style={{
          borderColor: "#E8E4DF",
          backgroundColor: dark ? "rgba(20,20,20,0.92)" : "rgba(255,255,255,0.94)",
          backdropFilter: "blur(6px)",
        }}
      >
        <div className="p-5 sm:p-7">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[11px] uppercase tracking-widest" style={{ fontFamily: MONO, color: dark ? "#7E8C8B" : "#9A9A9A" }}>
              {String(scene.id).padStart(2, "0")} · {scene.place}
            </span>
          </div>

          <h2
            className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-4"
            style={{ fontFamily: SERIF, color: dark ? "#F4F1EA" : "#1A1A1A" }}
          >
            {scene.title}
          </h2>

          <p
            className={`leading-relaxed mb-4 ${dark ? "text-sm sm:text-base" : "text-sm"}`}
            style={{ fontFamily: SANS, color: dark ? "#E2DED6" : "#3A3A3A" }}
          >
            {scene.prose.lead}
          </p>

          {/* Forced choice (the spine). Not present in crossing/still scenes. */}
          {scene.choice && (
            <div className="mb-4">
              <ForcedChoice
                choice={scene.choice}
                selectedId={selectedId}
                onSelect={(id) => onSelect(scene.id, id, scene.part)}
                reducedMotion={reducedMotion}
              />
            </div>
          )}

          {/* The turn (the gut-punch), revealed on completion. */}
          <AnimatePresence>
            {resolved && (
              <motion.p
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className={`leading-relaxed mb-4 italic ${dark ? "text-sm sm:text-base" : "text-sm"}`}
                style={{ fontFamily: SANS, color: dark ? "#C9A227" : "#1A1A1A" }}
              >
                {scene.prose.turn}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Minimize control for the whole revealed facts block (guess reveal
              + stat cards). Appears once the facts are showing. */}
          {canMinimize && (
            <div className="flex justify-end mb-3">
              <button
                type="button"
                onClick={() => setFactsCollapsed((c) => !c)}
                aria-expanded={!factsCollapsed}
                aria-label={factsCollapsed ? "Show the facts" : "Minimize the facts"}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2"
                style={{
                  fontFamily: SANS,
                  color: dark ? "#C9C4BD" : "#6B6B6B",
                  backgroundColor: dark ? "rgba(255,255,255,0.08)" : "#F3EFE8",
                }}
              >
                {factsCollapsed ? "Show the facts" : "Minimize the facts"}
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  aria-hidden="true"
                  style={{
                    transform: factsCollapsed ? "rotate(0deg)" : "rotate(180deg)",
                    transition: reducedMotion ? "none" : "transform 0.2s ease",
                  }}
                >
                  <path d="M2 3.5 L5 6.5 L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}

          {/* Guess-the-number (the hook). */}
          {scene.guess && (
            <div className="mb-4">
              <GuessTheNumber
                guess={scene.guess}
                fact={getFact(scene.guess.factId)}
                reducedMotion={reducedMotion}
                onReveal={onGuessReveal}
                collapsed={factsCollapsed}
              />
            </div>
          )}

          {/* Stat cards, flipped on completion. Hidden when minimized. */}
          {scene.facts && scene.facts.length > 0 && !factsCollapsed && (
            <div className="grid grid-cols-1 gap-3">
              {scene.facts.map((id) => (
                <StatCard key={id} fact={getFact(id)} flipped={resolved} />
              ))}
            </div>
          )}

          {/* Reduced-motion / linear article: a static per-scene assembly diagram. */}
          {reducedMotion && staticParts && staticParts.size > 0 && !dark && (
            <div className="mt-4 flex justify-center">
              <ChipAssembly parts={staticParts} reducedMotion compact shipped={staticParts.has("crate")} />
            </div>
          )}

          {/* Quincy: the diagram resolves into the photograph. No interaction. */}
          {scene.photoPlaceholder && (
            <div
              className="mt-4 rounded-lg border flex items-center justify-center aspect-[4/3]"
              style={{ borderColor: "#3A3A3A", backgroundColor: "#0E0E0E" }}
            >
              <p className="text-[11px] tracking-widest uppercase text-center px-4" style={{ fontFamily: MONO, color: "#5E6B6A" }}>
                Quincy photograph
                <br />
                <span className="text-[10px] normal-case tracking-normal">(my photo, lazy-loaded, slotted post-shoot)</span>
              </p>
            </div>
          )}

          {/* Epilogue: the reader's guesses, against the truth. */}
          {scene.epilogue && <RecapCard entries={guessEntries} />}
        </div>
      </div>
    </section>
  );
};

export default Scene;
