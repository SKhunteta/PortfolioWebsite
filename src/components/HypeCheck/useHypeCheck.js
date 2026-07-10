import { useMemo, useReducer } from "react";
import { STATES, TERMS, TIERS, OVERWHELM } from "./constants";

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

const initialState = (terms) => ({
  phase: STATES.INTRO,
  mode: "quiz",
  order: terms.map((t) => t.id),
  roundIndex: 0,
  score: 0,
  overwhelm: OVERWHELM.START,
  answers: [],
  selectedTermId: null,
});

const reducer = (terms) => (state, action) => {
  switch (action.type) {
    case "START":
      return {
        ...initialState(terms),
        phase: STATES.PLAYING,
        order: shuffle(terms).map((t) => t.id),
      };
    case "START_EXPLORE":
      // Explore keeps the authored term order — positions on the stage
      // are deterministic, so shuffling would buy nothing.
      return {
        ...initialState(terms),
        phase: STATES.PLAYING,
        mode: "explore",
      };
    case "SELECT_TERM": {
      if (state.mode !== "explore" || state.phase !== STATES.PLAYING)
        return state;
      if (!state.order.includes(action.termId)) return state;
      if (state.answers.some((a) => a.termId === action.termId)) return state;
      return { ...state, selectedTermId: action.termId };
    }
    case "CLOSE_TERM": {
      // Backing out of an unanswered popup costs nothing.
      if (state.mode !== "explore" || state.phase !== STATES.PLAYING)
        return state;
      return { ...state, selectedTermId: null };
    }
    case "ANSWER": {
      if (state.phase !== STATES.PLAYING) return state;
      const termId =
        state.mode === "explore"
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
      if (state.mode === "explore") {
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
      return initialState(terms);
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
// fixed, unshuffled dataset.
const useHypeCheck = (terms = TERMS) => {
  const [state, dispatch] = useReducer(reducer(terms), terms, initialState);

  const currentTerm = useMemo(() => {
    if (state.mode === "explore") {
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
    start: () => dispatch({ type: "START" }),
    startExplore: () => dispatch({ type: "START_EXPLORE" }),
    selectTerm: (termId) => dispatch({ type: "SELECT_TERM", termId }),
    closeTerm: () => dispatch({ type: "CLOSE_TERM" }),
    answer: (choice) => dispatch({ type: "ANSWER", choice }),
    next: () => dispatch({ type: "NEXT" }),
    restart: () => dispatch({ type: "RESTART" }),
  };
};

export default useHypeCheck;
