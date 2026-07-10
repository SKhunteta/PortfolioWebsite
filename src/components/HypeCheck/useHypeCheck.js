import { useMemo, useReducer } from "react";
import { STATES, TERMS, TIERS, OVERWHELM } from "./constants";
import { supportsWebGL } from "./diorama/dioramaUtils";

// Explore and diorama share the same click-a-word gameplay; only the
// stage differs (2D cloud vs 3D room).
const isFreeRoam = (mode) => mode === "explore" || mode === "diorama";

const clamp = (value) =>
  Math.min(OVERWHELM.MAX, Math.max(OVERWHELM.MIN, value));

const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// There is no lobby: the page opens straight into the 3D room — or the
// free-roam cloud, with the fallback note raised, when WebGL is missing.
const initialState = (terms, webgl = false) => ({
  phase: STATES.PLAYING,
  mode: webgl ? "diorama" : "explore",
  order: terms.map((t) => t.id),
  roundIndex: 0,
  score: 0,
  overwhelm: OVERWHELM.START,
  answers: [],
  selectedTermId: null,
  // Set when the 3D room had to fall back to explore because the
  // browser has no WebGL context.
  dioramaFallback: !webgl,
});

// A fresh run in `mode`. Quiz shuffles its round order; the free-roam
// stages keep the authored order — their positions are deterministic,
// so shuffling would buy nothing.
const freshRun = (terms, mode, dioramaFallback = false) => ({
  ...initialState(terms),
  mode,
  order:
    mode === "quiz"
      ? shuffle(terms).map((t) => t.id)
      : terms.map((t) => t.id),
  dioramaFallback,
});

const reducer = (terms) => (state, action) => {
  switch (action.type) {
    case "SWITCH_MODE": {
      const { mode } = action;
      const dioramaFallback = Boolean(action.dioramaFallback);
      // Re-picking the active mode is a no-op.
      if (mode === state.mode && dioramaFallback === state.dioramaFallback)
        return state;
      // Quiz is a different game (sequential, shuffled), and the end
      // screen always hands out a fresh run — reset in both cases.
      if (
        mode === "quiz" ||
        state.mode === "quiz" ||
        state.phase === STATES.DONE
      ) {
        return freshRun(terms, mode, dioramaFallback);
      }
      // explore↔diorama mid-run: same game on a different stage. Keep
      // answers/score/overwhelm, close any open popup, resume playing.
      return {
        ...state,
        mode,
        dioramaFallback,
        selectedTermId: null,
        phase: STATES.PLAYING,
      };
    }
    case "SELECT_TERM": {
      if (!isFreeRoam(state.mode) || state.phase !== STATES.PLAYING)
        return state;
      if (!state.order.includes(action.termId)) return state;
      if (state.answers.some((a) => a.termId === action.termId)) return state;
      return { ...state, selectedTermId: action.termId };
    }
    case "CLOSE_TERM": {
      // Backing out of an unanswered popup costs nothing.
      if (!isFreeRoam(state.mode) || state.phase !== STATES.PLAYING)
        return state;
      return { ...state, selectedTermId: null };
    }
    case "ANSWER": {
      if (state.phase !== STATES.PLAYING) return state;
      const termId = isFreeRoam(state.mode)
        ? state.selectedTermId
        : state.order[state.roundIndex];
      const term = terms.find((t) => t.id === termId);
      if (!term) return state;
      const correct = action.choice === term.category;
      return {
        ...state,
        phase: STATES.REVEAL,
        score: state.score + (correct ? 1 : 0),
        overwhelm: clamp(
          state.overwhelm +
            (correct ? OVERWHELM.CORRECT_DELTA : OVERWHELM.WRONG_DELTA)
        ),
        answers: [
          ...state.answers,
          { termId: term.id, choice: action.choice, correct },
        ],
      };
    }
    case "NEXT": {
      if (state.phase !== STATES.REVEAL) return state;
      if (isFreeRoam(state.mode)) {
        if (state.answers.length >= state.order.length) {
          return { ...state, phase: STATES.DONE, selectedTermId: null };
        }
        return { ...state, phase: STATES.PLAYING, selectedTermId: null };
      }
      const nextIndex = state.roundIndex + 1;
      if (nextIndex >= state.order.length) {
        return { ...state, phase: STATES.DONE };
      }
      return { ...state, phase: STATES.PLAYING, roundIndex: nextIndex };
    }
    case "RESTART":
      // Back to a fresh run in the same place the page opens: the 3D
      // room, or the explore cloud when WebGL is missing.
      return initialState(terms, action.webgl);
    default:
      return state;
  }
};

export const tierFor = (score) =>
  TIERS.find((tier) => score >= tier.min) ?? TIERS[TIERS.length - 1];

// Maps overwhelm (0–100) onto the six figure images: 1 = serene and
// lifted, 6 = fully overloaded. Bands: 0–16, 17–33, 34–50, 51–66,
// 67–83, 84–100.
export const figureStageFor = (overwhelm) => {
  if (overwhelm >= 84) return 6;
  if (overwhelm >= 67) return 5;
  if (overwhelm >= 51) return 4;
  if (overwhelm >= 34) return 3;
  if (overwhelm >= 17) return 2;
  return 1;
};

// Core game state machine. `terms` is injectable so tests can pass a
// fixed, unshuffled dataset; `webgl` so jsdom tests can force either
// landing (left undefined, the real capability check runs once).
const useHypeCheck = (terms = TERMS, webgl) => {
  const [state, dispatch] = useReducer(reducer(terms), terms, (t) =>
    initialState(t, webgl ?? supportsWebGL())
  );

  const currentTerm = useMemo(() => {
    if (isFreeRoam(state.mode)) {
      return terms.find((t) => t.id === state.selectedTermId) ?? null;
    }
    return terms.find((t) => t.id === state.order[state.roundIndex]) ?? null;
  }, [terms, state.mode, state.selectedTermId, state.order, state.roundIndex]);

  const answeredById = useMemo(
    () => Object.fromEntries(state.answers.map((a) => [a.termId, a])),
    [state.answers]
  );

  const intensity =
    state.overwhelm >= OVERWHELM.OVERLOAD_AT
      ? "overload"
      : state.overwhelm >= OVERWHELM.RISING_AT
        ? "rising"
        : "calm";

  const lastAnswer = state.answers[state.answers.length - 1] ?? null;

  return {
    ...state,
    terms,
    total: terms.length,
    currentTerm,
    answeredById,
    intensity,
    figureStage: figureStageFor(state.overwhelm),
    lastAnswer,
    tier: tierFor(state.score),
    // `webgl` is injectable so jsdom tests can force either branch.
    // Picking the 3D room without WebGL degrades to explore and raises
    // the dioramaFallback flag (GameScene shows the note for it).
    switchMode: (mode, webgl = supportsWebGL()) =>
      dispatch(
        mode === "diorama" && !webgl
          ? { type: "SWITCH_MODE", mode: "explore", dioramaFallback: true }
          : { type: "SWITCH_MODE", mode }
      ),
    selectTerm: (termId) => dispatch({ type: "SELECT_TERM", termId }),
    closeTerm: () => dispatch({ type: "CLOSE_TERM" }),
    answer: (choice) => dispatch({ type: "ANSWER", choice }),
    next: () => dispatch({ type: "NEXT" }),
    // Also probes WebGL so the fresh run lands on the same stage a page
    // load would. Injectable for the same reason as switchMode.
    restart: (webgl = supportsWebGL()) => dispatch({ type: "RESTART", webgl }),
  };
};

export default useHypeCheck;
