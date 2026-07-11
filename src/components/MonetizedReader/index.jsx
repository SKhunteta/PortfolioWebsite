import { useCallback, useEffect } from "react";
import { useReducedMotion } from "framer-motion";
import useNeuralSession from "./useNeuralSession";
import useParagraphObserver from "./useParagraphObserver";
import BootSequence from "./BootSequence";
import NeuralHUD from "./NeuralHUD";
import MarketTicker from "./MarketTicker";
import AlertToast from "./AlertToast";
import HaroldCallOverlay from "./HaroldCallOverlay";
import ExcerptReader from "./ExcerptReader";
import SessionSummary from "./SessionSummary";
import { END_SENTINEL_ID } from "./constants";

const MonetizedReader = () => {
  const reducedMotion = useReducedMotion();
  const session = useNeuralSession();
  const {
    phase,
    beginSession,
    completeSession,
    onParagraphEnter,
    earnings,
    emotionLevels,
    dominantEmotion,
    contaminationActive,
    alerts,
    dismissAlert,
    tickerHistory,
    haroldCall,
    dismissHarold,
    stats,
    progressPercent,
  } = session;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "The Monetized Reader";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const handleParagraphEnter = useCallback(
    (id) => {
      if (id === END_SENTINEL_ID) {
        completeSession();
      } else {
        onParagraphEnter(id);
      }
    },
    [completeSession, onParagraphEnter]
  );

  const { registerParagraph } = useParagraphObserver({
    onParagraphEnter: handleParagraphEnter,
    enabled: phase !== "boot",
  });

  if (phase === "boot") {
    return <BootSequence onConnect={beginSession} reducedMotion={reducedMotion} />;
  }

  const latestAlert = alerts[alerts.length - 1];

  return (
    <div className="min-h-screen bg-mr-bg">
      <NeuralHUD
        emotionLevels={emotionLevels}
        dominantEmotion={dominantEmotion}
        earnings={earnings}
        contaminationActive={contaminationActive}
        progressPercent={phase === "complete" ? 100 : progressPercent}
        frozen={phase === "complete"}
        reducedMotion={reducedMotion}
      />

      {/* Screen reader announcements for market events */}
      <div className="sr-only" aria-live="polite">
        {latestAlert?.event.message}
      </div>

      <main className="pt-32 md:pt-36 pb-24">
        <ExcerptReader registerParagraph={registerParagraph} />

        {/* Crossing this sentinel ends the session and freezes the counter */}
        <div
          ref={registerParagraph(END_SENTINEL_ID)}
          data-pid={END_SENTINEL_ID}
          className="h-px"
          aria-hidden="true"
        />

        <div className="mt-16">
          {phase === "complete" ? (
            <SessionSummary stats={stats} />
          ) : (
            <p
              className="text-center font-mono text-[10px] uppercase tracking-[0.25em] text-mr-text-muted"
              aria-hidden="true"
            >
              End of licensed excerpt · finalizing session…
            </p>
          )}
        </div>
      </main>

      <AlertToast
        alerts={alerts}
        onDismiss={dismissAlert}
        reducedMotion={reducedMotion}
      />
      <HaroldCallOverlay
        haroldCall={haroldCall}
        onDecline={dismissHarold}
        reducedMotion={reducedMotion}
      />
      <MarketTicker history={tickerHistory} reducedMotion={reducedMotion} />
    </div>
  );
};

export default MonetizedReader;
