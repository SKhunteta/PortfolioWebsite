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
  order: terms.map((t) => t.id),
  roundIndex: 0,
  score: 0,
  overwhelm: OVERWHELM.START,
  answers: [],
});

const reducer = (terms) => (state, action) => {
  switch (action.type) {
    case "START":
      return {
        ...initialState(terms),
        phase: STATES.PLAYING,
        order: shuffle(terms).map((t) => t.id),
      };
    case "ANSWER": {
      if (state.phase !== STATES.PLAYING) return state;
      const term = terms.find((t) => t.id === state.order[state.roundIndex]);
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

// Core game state machine. `terms` is injectable so tests can pass a
// fixed, unshuffled dataset.
const useHypeCheck = (terms = TERMS) => {
  const [state, dispatch] = useReducer(reducer(terms), terms, initialState);

  const currentTerm = useMemo(
    () => terms.find((t) => t.id === state.order[state.roundIndex]) ?? null,
    [terms, state.order, state.roundIndex]
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
    total: terms.length,
    currentTerm,
    intensity,
    lastAnswer,
    tier: tierFor(state.score),
    start: () => dispatch({ type: "START" }),
    answer: (choice) => dispatch({ type: "ANSWER", choice }),
    next: () => dispatch({ type: "NEXT" }),
    restart: () => dispatch({ type: "RESTART" }),
  };
};

export default useHypeCheck;
