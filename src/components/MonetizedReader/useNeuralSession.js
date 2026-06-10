import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EMOTIONS,
  EVENTS,
  EXCERPT,
  PARAGRAPHS_BY_ID,
  SIM,
  TONE_EMOTION_TARGETS,
} from "./constants";

const initialLevels = () =>
  Object.fromEntries(
    Object.entries(EMOTIONS).map(([key, emotion]) => [key, emotion.baseline])
  );

const initialStats = () => ({
  unitsSold: {},
  alertsTriggered: 0,
  haroldCalls: 0,
  contaminationEvents: 0,
  peakHappiness: 0,
  startedAt: null,
});

/**
 * The brain of the Monetized Reader. Runs the fake neural-interface session:
 * passive earnings drip, emotion meters easing toward the active paragraph's
 * tone, once-only market events, the alert queue, and session stats.
 *
 * All meaningful numbers (sale amounts) are deterministic; randomness only
 * jitters the passive drip.
 */
export default function useNeuralSession() {
  const [phase, setPhase] = useState("boot"); // boot | reading | complete
  const [earnings, setEarnings] = useState(0);
  const [emotionLevels, setEmotionLevels] = useState(initialLevels);
  const [alerts, setAlerts] = useState([]);
  const [tickerHistory, setTickerHistory] = useState([]);
  const [haroldCall, setHaroldCall] = useState(null);
  const [contaminationActive, setContaminationActive] = useState(false);
  const [activeParagraphId, setActiveParagraphId] = useState(null);
  const [stats, setStats] = useState(null);

  const phaseRef = useRef("boot");
  const firedRef = useRef(new Set());
  const marketRateRef = useRef(1);
  const earningsRef = useRef(0);
  const activeParagraphRef = useRef(null);
  const statsRef = useRef(initialStats());
  const alertIdRef = useRef(0);
  const timeoutsRef = useRef(new Set());

  useEffect(() => {
    earningsRef.current = earnings;
  }, [earnings]);

  useEffect(() => {
    activeParagraphRef.current = activeParagraphId;
  }, [activeParagraphId]);

  // Track and clean up every timeout the session schedules.
  const schedule = useCallback((fn, ms) => {
    const id = setTimeout(() => {
      timeoutsRef.current.delete(id);
      fn();
    }, ms);
    timeoutsRef.current.add(id);
    return id;
  }, []);

  useEffect(() => {
    const pending = timeoutsRef.current;
    return () => {
      pending.forEach((id) => clearTimeout(id));
      pending.clear();
    };
  }, []);

  const dismissAlert = useCallback((alertId) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  }, []);

  const pushAlert = useCallback(
    (eventId, event) => {
      alertIdRef.current += 1;
      const alert = { id: `alert-${alertIdRef.current}`, eventId, event };
      setAlerts((prev) => [
        ...prev.slice(-(SIM.MAX_VISIBLE_ALERTS - 1)),
        alert,
      ]);
      statsRef.current.alertsTriggered += 1;
      schedule(() => dismissAlert(alert.id), SIM.ALERT_DISMISS_MS);
    },
    [dismissAlert, schedule]
  );

  const fireEvent = useCallback(
    (eventId) => {
      if (firedRef.current.has(eventId)) return;
      const event = EVENTS[eventId];
      if (!event) return;
      firedRef.current.add(eventId);

      if (event.kind === "sale") {
        const amount = event.units * event.pricePerUnit;
        setEarnings((prev) => prev + amount);
        const sold = statsRef.current.unitsSold;
        sold[event.emotion] = (sold[event.emotion] || 0) + event.units;
      }

      if (event.marketDip) {
        marketRateRef.current = event.marketDip;
        setContaminationActive(true);
        statsRef.current.contaminationEvents += 1;
        schedule(() => {
          marketRateRef.current = 1;
          setContaminationActive(false);
        }, event.dipDurationMs);
      }

      if (event.kind === "harold") {
        setHaroldCall(event);
        statsRef.current.haroldCalls += 1;
        setTickerHistory((prev) => [...prev, event.message]);
        return; // Harold gets the full-screen overlay, not a toast.
      }

      setTickerHistory((prev) => [...prev, event.message]);
      pushAlert(eventId, event);
    },
    [pushAlert, schedule]
  );

  const onParagraphEnter = useCallback(
    (paragraphId) => {
      if (phaseRef.current !== "reading") return;
      setActiveParagraphId(paragraphId);
      const paragraph = PARAGRAPHS_BY_ID.get(paragraphId);
      paragraph?.events?.forEach(fireEvent);
    },
    [fireEvent]
  );

  // Passive drip + meter easing.
  useEffect(() => {
    if (phase !== "reading") return undefined;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return; // no signal, no harvest
      }
      setEmotionLevels((prev) => {
        const paragraph = PARAGRAPHS_BY_ID.get(activeParagraphRef.current);
        const targets = TONE_EMOTION_TARGETS[paragraph?.tone || "neutral"];
        const next = {};
        Object.keys(prev).forEach((key) => {
          next[key] = prev[key] + (targets[key] - prev[key]) * SIM.LERP;
        });
        statsRef.current.peakHappiness = Math.max(
          statsRef.current.peakHappiness,
          next.happiness
        );
        return next;
      });
      setEarnings((prev) => {
        const jitter = 1 + (Math.random() * 2 - 1) * SIM.JITTER;
        return prev + SIM.BASE_RATE_PER_TICK * marketRateRef.current * jitter;
      });
    }, SIM.TICK_MS);
    return () => clearInterval(interval);
  }, [phase]);

  // Linger detection: dwell on a paragraph long enough and its lingerEvent fires.
  useEffect(() => {
    if (phase !== "reading" || !activeParagraphId) return undefined;
    const paragraph = PARAGRAPHS_BY_ID.get(activeParagraphId);
    if (!paragraph?.lingerEvent) return undefined;
    const id = setTimeout(() => fireEvent(paragraph.lingerEvent), SIM.LINGER_MS);
    return () => clearTimeout(id);
  }, [phase, activeParagraphId, fireEvent]);

  // Sustained happiness above threshold forces contamination regardless of
  // paragraph annotations.
  useEffect(() => {
    if (phase !== "reading") return;
    if (emotionLevels.happiness > SIM.HAPPINESS_THRESHOLD) {
      fireEvent("happiness-contam");
    }
  }, [phase, emotionLevels.happiness, fireEvent]);

  const beginSession = useCallback(() => {
    if (phaseRef.current !== "boot") return;
    phaseRef.current = "reading";
    statsRef.current.startedAt = Date.now();
    setPhase("reading");
  }, []);

  const completeSession = useCallback(() => {
    if (phaseRef.current !== "reading") return;
    phaseRef.current = "complete";
    const s = statsRef.current;
    setStats({
      totalEarned: earningsRef.current,
      unitsSold: { ...s.unitsSold },
      alertsTriggered: s.alertsTriggered,
      haroldCalls: s.haroldCalls,
      contaminationEvents: s.contaminationEvents,
      peakHappiness: Math.round(s.peakHappiness),
      readingTimeMs: s.startedAt ? Date.now() - s.startedAt : 0,
      marketDisruptionBps: Math.round(
        s.peakHappiness * (s.contaminationEvents + 1)
      ),
    });
    setPhase("complete");
  }, []);

  const dismissHarold = useCallback(
    (withGuilt = false) => {
      setHaroldCall(null);
      if (withGuilt) fireEvent("sale-guilt");
    },
    [fireEvent]
  );

  const dominantEmotion = useMemo(() => {
    let best = null;
    Object.entries(emotionLevels).forEach(([key, level]) => {
      if (!best || level > best.level) best = { key, level };
    });
    return best?.key ?? "melancholy";
  }, [emotionLevels]);

  const progressPercent = useMemo(() => {
    if (!activeParagraphId) return 0;
    const index = EXCERPT.findIndex((p) => p.id === activeParagraphId);
    if (index < 0) return 0;
    return Math.round(((index + 1) / EXCERPT.length) * 100);
  }, [activeParagraphId]);

  return {
    phase,
    beginSession,
    completeSession,
    onParagraphEnter,
    activeParagraphId,
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
  };
}
