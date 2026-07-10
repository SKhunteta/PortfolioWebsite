import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useHypeCheck, { tierFor } from "../useHypeCheck";
import { STATES, TERMS, TIERS, OVERWHELM } from "../constants";

// A tiny fixed dataset so rounds are predictable.
const FIXED_TERMS = [
  { id: "a", term: "alpha", category: "alive", verdictLabel: "v", fact: "f", factDate: "d" },
  { id: "b", term: "beta", category: "dead", verdictLabel: "v", fact: "f", factDate: "d" },
  { id: "c", term: "gamma", category: "fake", verdictLabel: "v", fact: "f", factDate: "d" },
];

describe("useHypeCheck", () => {
  beforeEach(() => {
    // Freeze the shuffle so order stays a, b, c.
    vi.spyOn(Math, "random").mockReturnValue(0.9999);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts on the intro with a fresh meter", () => {
    const { result } = renderHook(() => useHypeCheck(FIXED_TERMS));
    expect(result.current.phase).toBe(STATES.INTRO);
    expect(result.current.overwhelm).toBe(OVERWHELM.START);
    expect(result.current.score).toBe(0);
    expect(result.current.total).toBe(FIXED_TERMS.length);
  });

  it("moves to playing with a current term on start", () => {
    const { result } = renderHook(() => useHypeCheck(FIXED_TERMS));
    act(() => result.current.start());
    expect(result.current.phase).toBe(STATES.PLAYING);
    expect(result.current.currentTerm.id).toBe("a");
  });

  it("scores a correct answer and calms the meter", () => {
    const { result } = renderHook(() => useHypeCheck(FIXED_TERMS));
    act(() => result.current.start());
    act(() => result.current.answer("alive"));
    expect(result.current.phase).toBe(STATES.REVEAL);
    expect(result.current.score).toBe(1);
    expect(result.current.overwhelm).toBe(
      OVERWHELM.START + OVERWHELM.CORRECT_DELTA
    );
    expect(result.current.lastAnswer).toMatchObject({
      termId: "a",
      choice: "alive",
      correct: true,
    });
  });

  it("spikes the meter on a wrong answer without scoring", () => {
    const { result } = renderHook(() => useHypeCheck(FIXED_TERMS));
    act(() => result.current.start());
    act(() => result.current.answer("fake"));
    expect(result.current.score).toBe(0);
    expect(result.current.overwhelm).toBe(
      OVERWHELM.START + OVERWHELM.WRONG_DELTA
    );
    expect(result.current.lastAnswer.correct).toBe(false);
  });

  it("clamps the meter to its bounds", () => {
    const { result } = renderHook(() => useHypeCheck(FIXED_TERMS));
    act(() => result.current.start());
    // Enough wrong answers to blow past 100 if unclamped.
    for (let i = 0; i < FIXED_TERMS.length; i += 1) {
      act(() => result.current.answer("__nonsense__"));
      if (i < FIXED_TERMS.length - 1) act(() => result.current.next());
    }
    expect(result.current.overwhelm).toBeLessThanOrEqual(OVERWHELM.MAX);
    expect(result.current.overwhelm).toBeGreaterThanOrEqual(OVERWHELM.MIN);
  });

  it("ignores answers outside the playing phase", () => {
    const { result } = renderHook(() => useHypeCheck(FIXED_TERMS));
    act(() => result.current.answer("alive"));
    expect(result.current.phase).toBe(STATES.INTRO);
    expect(result.current.answers).toHaveLength(0);
  });

  it("advances rounds and finishes after the last term", () => {
    const { result } = renderHook(() => useHypeCheck(FIXED_TERMS));
    act(() => result.current.start());
    for (const choice of ["alive", "dead", "fake"]) {
      act(() => result.current.answer(choice));
      act(() => result.current.next());
    }
    expect(result.current.phase).toBe(STATES.DONE);
    expect(result.current.score).toBe(3);
    expect(result.current.answers).toHaveLength(3);
    expect(result.current.tier).toBe(tierFor(3));
  });

  it("derives intensity from the meter", () => {
    const { result } = renderHook(() => useHypeCheck(FIXED_TERMS));
    expect(result.current.intensity).toBe("rising"); // START = 40
    act(() => result.current.start());
    act(() => result.current.answer("__wrong__"));
    act(() => result.current.next());
    act(() => result.current.answer("__wrong__"));
    act(() => result.current.next());
    act(() => result.current.answer("__wrong__"));
    // 40 + 36 = 76 ≥ OVERLOAD_AT
    expect(result.current.intensity).toBe("overload");
  });

  it("resets everything on restart", () => {
    const { result } = renderHook(() => useHypeCheck(FIXED_TERMS));
    act(() => result.current.start());
    act(() => result.current.answer("alive"));
    act(() => result.current.restart());
    expect(result.current.phase).toBe(STATES.INTRO);
    expect(result.current.score).toBe(0);
    expect(result.current.overwhelm).toBe(OVERWHELM.START);
    expect(result.current.answers).toHaveLength(0);
  });

  it("plays the real dataset end to end", () => {
    const { result } = renderHook(() => useHypeCheck());
    act(() => result.current.start());
    for (let i = 0; i < TERMS.length; i += 1) {
      act(() => result.current.answer(result.current.currentTerm.category));
      act(() => result.current.next());
    }
    expect(result.current.phase).toBe(STATES.DONE);
    expect(result.current.score).toBe(TERMS.length);
    expect(result.current.tier).toBe(TIERS[0]);
  });
});
