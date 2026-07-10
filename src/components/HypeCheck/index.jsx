import React, { Suspense, lazy, useEffect } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import ViewSourceLink from "../ViewSourceLink";
import useHypeCheck from "./useHypeCheck";
import IntroScene from "./IntroScene";
import GameScene from "./GameScene";
import EndScreen from "./EndScreen";
import { STATES } from "./constants";

// The 3D room pulls in three.js — lazy-loaded so the chunk is only
// downloaded when someone actually enters the room.
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

      <main className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {game.phase === STATES.INTRO && (
            <IntroScene
              key="intro"
              onStart={game.start}
              onStartExplore={game.startExplore}
              onStartDiorama={game.startDiorama}
            />
          )}

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
