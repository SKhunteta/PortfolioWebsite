import React, { Suspense, lazy, useEffect } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import ViewSourceLink from "../ViewSourceLink";
import useHypeCheck from "./useHypeCheck";
import GameScene from "./GameScene";
import EndScreen from "./EndScreen";
import ModeToggle from "./ModeToggle";
import { STATES, KNOWLEDGE_CUTOFF } from "./constants";

// The 3D room pulls in three.js — lazy-loaded so the main bundle stays
// light and browsers without WebGL (which land in the explore cloud)
// never download the chunk.
const DioramaScene = lazy(() => import("./diorama/DioramaScene"));

const HypeCheck = () => {
  const game = useHypeCheck();

  useEffect(() => {
    document.title = "Hype Check — July 2026 · Built by Shrey";
  }, []);

  return (
    <div className="min-h-screen bg-hype-bg flex flex-col">
      <header className="border-b border-hype-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="text-sm text-hype-muted hover:text-hype-text transition-colors font-sans-ele"
          >
            ← Back to portfolio
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase tracking-widest text-hype-muted font-sans-ele">
              Hype Check
            </span>
            <ViewSourceLink
              dir="src/components/HypeCheck"
              className="text-xs text-hype-muted"
            />
          </div>
        </div>
      </header>

      {/* Framing blurb + mode toggle — the intro page, compressed into
          one unobtrusive bar. The game itself is already running. */}
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 pt-4 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-hype-muted text-xs sm:text-sm leading-relaxed font-sans-ele max-w-xl">
          It&rsquo;s {KNOWLEDGE_CUTOFF} — one year after the timeline was a
          lot. {game.total} buzzwords: which are still everywhere, which are
          dead, and which did we just make up? Click a word to judge it — or
          take the quiz.
        </p>
        <ModeToggle mode={game.mode} onSwitch={game.switchMode} />
      </div>

      <main className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {(game.phase === STATES.PLAYING || game.phase === STATES.REVEAL) &&
            (game.mode === "diorama" ? (
              <Suspense
                key="diorama"
                fallback={
                  <p className="flex-1 flex items-center justify-center text-hype-muted text-sm font-sans-ele">
                    Setting up the room…
                  </p>
                }
              >
                <DioramaScene game={game} />
              </Suspense>
            ) : (
              <GameScene key="game" game={game} />
            ))}

          {game.phase === STATES.DONE && <EndScreen key="end" game={game} />}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default HypeCheck;
