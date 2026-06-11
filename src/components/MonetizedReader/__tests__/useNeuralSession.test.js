import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useNeuralSession from "../useNeuralSession";
import { EVENTS, SIM } from "../constants";

const VIENNA_SALE =
  EVENTS["sale-vienna-grief"].units * EVENTS["sale-vienna-grief"].pricePerUnit;

const setVisibility = (state) => {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
};

describe("useNeuralSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Neutralize the passive-drip jitter so totals are exact.
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    setVisibility("visible");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    setVisibility("visible");
  });

  it("starts in boot with zero earnings and ignores paragraphs until the session begins", () => {
    const { result } = renderHook(() => useNeuralSession());
    expect(result.current.phase).toBe("boot");
    expect(result.current.earnings).toBe(0);

    act(() => result.current.onParagraphEnter("p-05"));
    expect(result.current.earnings).toBe(0);
    expect(result.current.alerts).toHaveLength(0);
  });

  it("accrues no passive earnings — money comes only from events", () => {
    const { result } = renderHook(() => useNeuralSession());
    act(() => {
      vi.advanceTimersByTime(SIM.TICK_MS * 3);
    });
    expect(result.current.earnings).toBe(0);

    act(() => result.current.beginSession());
    act(() => {
      vi.advanceTimersByTime(SIM.TICK_MS * 3);
    });
    expect(result.current.earnings).toBe(0);

    act(() => result.current.onParagraphEnter("p-05"));
    expect(result.current.earnings).toBeCloseTo(VIENNA_SALE, 5);
  });

  it("fires a sale event exactly once per session", () => {
    const { result } = renderHook(() => useNeuralSession());
    act(() => result.current.beginSession());

    act(() => result.current.onParagraphEnter("p-05"));
    expect(result.current.earnings).toBeCloseTo(VIENNA_SALE, 5);
    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.tickerHistory).toContain(
      EVENTS["sale-vienna-grief"].message
    );

    // Scrolling back over the same paragraph must not re-fire.
    act(() => result.current.onParagraphEnter("p-05"));
    expect(result.current.earnings).toBeCloseTo(VIENNA_SALE, 5);
    expect(result.current.tickerHistory).toHaveLength(1);
  });

  it("auto-dismisses alerts and supports manual dismissal", () => {
    const { result } = renderHook(() => useNeuralSession());
    act(() => result.current.beginSession());
    act(() => result.current.onParagraphEnter("p-05"));
    expect(result.current.alerts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(SIM.ALERT_DISMISS_MS);
    });
    expect(result.current.alerts).toHaveLength(0);

    act(() => result.current.onParagraphEnter("p-08"));
    const alertId = result.current.alerts[0].id;
    act(() => result.current.dismissAlert(alertId));
    expect(result.current.alerts).toHaveLength(0);
  });

  it("triggers contamination after lingering on a funny paragraph, then recovers", () => {
    const { result } = renderHook(() => useNeuralSession());
    act(() => result.current.beginSession());
    act(() => result.current.onParagraphEnter("p-15"));
    expect(result.current.contaminationActive).toBe(false);

    act(() => {
      vi.advanceTimersByTime(SIM.LINGER_MS);
    });
    expect(result.current.contaminationActive).toBe(true);

    act(() => {
      vi.advanceTimersByTime(EVENTS["happiness-contam"].dipDurationMs);
    });
    expect(result.current.contaminationActive).toBe(false);
  });

  it("moving to another paragraph cancels the pending linger event", () => {
    const { result } = renderHook(() => useNeuralSession());
    act(() => result.current.beginSession());
    act(() => result.current.onParagraphEnter("p-15"));
    act(() => {
      vi.advanceTimersByTime(SIM.LINGER_MS / 2);
    });
    act(() => result.current.onParagraphEnter("p-18"));
    act(() => {
      vi.advanceTimersByTime(SIM.LINGER_MS);
    });
    expect(result.current.contaminationActive).toBe(false);
  });

  it("handles the Harold call, including selling the guilt", () => {
    const { result } = renderHook(() => useNeuralSession());
    act(() => result.current.beginSession());
    act(() => result.current.onParagraphEnter("p-19"));
    expect(result.current.haroldCall).toBeTruthy();
    // Harold goes to the overlay, not the toast stack.
    expect(result.current.alerts).toHaveLength(0);

    const before = result.current.earnings;
    act(() => result.current.dismissHarold(true));
    expect(result.current.haroldCall).toBeNull();
    expect(result.current.earnings - before).toBeCloseTo(
      EVENTS["sale-guilt"].units * EVENTS["sale-guilt"].pricePerUnit,
      5
    );
  });

  it("stops easing the meters while the tab is hidden", () => {
    const { result } = renderHook(() => useNeuralSession());
    act(() => result.current.beginSession());

    const before = { ...result.current.emotionLevels };
    setVisibility("hidden");
    act(() => {
      vi.advanceTimersByTime(SIM.TICK_MS * 5);
    });
    expect(result.current.emotionLevels).toEqual(before);

    setVisibility("visible");
    act(() => {
      vi.advanceTimersByTime(SIM.TICK_MS);
    });
    expect(result.current.emotionLevels).not.toEqual(before);
  });

  it("completes the session with frozen stats", () => {
    const { result } = renderHook(() => useNeuralSession());
    act(() => result.current.beginSession());
    act(() => result.current.onParagraphEnter("p-05"));
    act(() => result.current.completeSession());

    expect(result.current.phase).toBe("complete");
    expect(result.current.stats).toBeTruthy();
    expect(result.current.stats.totalEarned).toBeCloseTo(VIENNA_SALE, 5);
    expect(result.current.stats.unitsSold.grief).toBe(
      EVENTS["sale-vienna-grief"].units
    );

    // No further accrual after disconnect.
    act(() => {
      vi.advanceTimersByTime(SIM.TICK_MS * 5);
    });
    expect(result.current.earnings).toBeCloseTo(VIENNA_SALE, 5);

    // completeSession is idempotent.
    act(() => result.current.completeSession());
    expect(result.current.phase).toBe("complete");
  });
});
