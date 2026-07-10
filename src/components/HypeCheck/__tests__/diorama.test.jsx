import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HypeCheck from "..";
import useHypeCheck from "../useHypeCheck";
import { TERMS, CHOICES, OVERWHELM, STATES } from "../constants";
import {
  CAMERA,
  CATEGORY_COLORS,
  desaturationFor,
  fogDensityFor,
  mixHex,
  orbitSpeedFor,
  shakeAmplitudeFor,
  supportsWebGL,
  wordAppearanceFor,
  wordPlacementFor,
  wordPositionAt,
} from "../diorama/dioramaUtils";

// The 3D scene itself can't render in jsdom (no WebGL), so these tests
// cover everything that drives it: the pure scene math, the reducer
// wiring for diorama mode, and the WebGL fallback path.

describe("diorama word placement", () => {
  it("is deterministic and keeps every word inside the room", () => {
    TERMS.forEach((_, index) => {
      const a = wordPlacementFor(index);
      const b = wordPlacementFor(index);
      expect(a).toEqual(b);
      expect(a.radius).toBeGreaterThanOrEqual(2.3);
      expect(a.radius).toBeLessThanOrEqual(4.5);
      expect(a.height).toBeGreaterThan(0);
      expect(a.height).toBeLessThan(3);
      expect(a.fontSize).toBeGreaterThan(0.1);
      expect(Math.abs(a.speedFactor)).toBeGreaterThan(0);
    });
  });

  it("spreads words across depths so zooming creates parallax", () => {
    const radii = new Set(
      TERMS.map((_, index) => wordPlacementFor(index).radius)
    );
    expect(radii.size).toBeGreaterThanOrEqual(4);
    // Some words orbit closer to the camera path than the min zoom, so
    // they can pass between the lens and the figure.
    const closest = Math.min(...radii);
    expect(closest).toBeLessThan(CAMERA.MIN_DISTANCE);
  });

  it("orbits words around the figure over time", () => {
    const placement = wordPlacementFor(0);
    const p0 = wordPositionAt(placement, 0, 0.1);
    const p1 = wordPositionAt(placement, 5, 0.1);
    expect(p0).not.toEqual(p1);
    // Same radius before and after: it's an orbit, not a drift-away.
    const r0 = Math.hypot(p0[0], p0[2]);
    const r1 = Math.hypot(p1[0], p1[2]);
    expect(r0).toBeCloseTo(r1, 1);
  });
});

describe("diorama atmosphere curves", () => {
  it("thickens fog and speeds the orbit as overwhelm climbs", () => {
    expect(fogDensityFor(100)).toBeGreaterThan(fogDensityFor(0));
    expect(orbitSpeedFor(100)).toBeGreaterThan(orbitSpeedFor(0));
    expect(fogDensityFor(0)).toBeGreaterThan(0);
    expect(orbitSpeedFor(0)).toBeGreaterThan(0);
  });

  it("only shakes the room at overload", () => {
    expect(shakeAmplitudeFor(0)).toBe(0);
    expect(shakeAmplitudeFor(OVERWHELM.OVERLOAD_AT - 1)).toBe(0);
    expect(shakeAmplitudeFor(OVERWHELM.OVERLOAD_AT + 10)).toBeGreaterThan(0);
    expect(shakeAmplitudeFor(100)).toBeGreaterThan(
      shakeAmplitudeFor(OVERWHELM.OVERLOAD_AT + 10)
    );
  });

  it("desaturates progressively but never fully to gray", () => {
    expect(desaturationFor(0)).toBe(0);
    expect(desaturationFor(100)).toBeGreaterThan(0);
    expect(desaturationFor(100)).toBeLessThan(1);
  });
});

describe("diorama word appearance", () => {
  const term = TERMS[0];

  it("shows unanswered words bright white and clickable", () => {
    const look = wordAppearanceFor(term, undefined, 0);
    expect(look.color.toLowerCase()).toBe("#f5f5f5");
    expect(look.opacity).toBe(1);
    expect(look.interactive).toBe(true);
  });

  it("dims answered words and tints them by category", () => {
    for (const category of ["alive", "dead", "fake"]) {
      const t = TERMS.find((x) => x.category === category);
      const look = wordAppearanceFor(
        t,
        { termId: t.id, choice: category, correct: true },
        0
      );
      expect(look.color.toLowerCase()).toBe(
        CATEGORY_COLORS[category].toLowerCase()
      );
      expect(look.opacity).toBeLessThan(1);
      expect(look.interactive).toBe(false);
    }
  });

  it("pulls colors toward gray at high overwhelm", () => {
    const calm = wordAppearanceFor(term, undefined, 0);
    const frantic = wordAppearanceFor(term, undefined, 100);
    expect(frantic.color).not.toBe(calm.color);
    expect(frantic.color).toBe(mixHex("#F5F5F5", "#8A8A8A", desaturationFor(100)));
  });
});

describe("mixHex", () => {
  it("interpolates hex colors", () => {
    expect(mixHex("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 1)).toBe("#ffffff");
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
  });
});

describe("supportsWebGL", () => {
  it("is false in jsdom (no canvas contexts)", () => {
    expect(supportsWebGL()).toBe(false);
  });
});

describe("useHypeCheck diorama mode", () => {
  it("enters diorama mode with explore-parity gameplay", () => {
    const { result } = renderHook(() => useHypeCheck(TERMS));
    act(() => result.current.switchMode("diorama", true));
    expect(result.current.mode).toBe("diorama");
    expect(result.current.phase).toBe(STATES.PLAYING);
    expect(result.current.dioramaFallback).toBe(false);

    // Click a word, answer it, come back to the room.
    const term = TERMS[0];
    act(() => result.current.selectTerm(term.id));
    expect(result.current.currentTerm?.id).toBe(term.id);

    act(() => result.current.answer(term.category));
    expect(result.current.phase).toBe(STATES.REVEAL);
    expect(result.current.score).toBe(1);
    expect(result.current.answeredById[term.id]).toBeDefined();

    act(() => result.current.next());
    expect(result.current.phase).toBe(STATES.PLAYING);
    expect(result.current.selectedTermId).toBeNull();

    // Closing an unanswered popup costs nothing.
    act(() => result.current.selectTerm(TERMS[1].id));
    act(() => result.current.closeTerm());
    expect(result.current.currentTerm).toBeNull();
    expect(result.current.answers).toHaveLength(1);
  });

  it("reaches the end screen after all terms are answered", () => {
    const { result } = renderHook(() => useHypeCheck(TERMS));
    act(() => result.current.switchMode("diorama", true));
    for (const term of TERMS) {
      act(() => result.current.selectTerm(term.id));
      act(() => result.current.answer(term.category));
      act(() => result.current.next());
    }
    expect(result.current.phase).toBe(STATES.DONE);
    expect(result.current.score).toBe(TERMS.length);
  });

  it("falls back to explore mode when WebGL is unavailable", () => {
    const { result } = renderHook(() => useHypeCheck(TERMS));
    // Default arg runs the real capability check, which fails in jsdom.
    act(() => result.current.switchMode("diorama"));
    expect(result.current.mode).toBe("explore");
    expect(result.current.dioramaFallback).toBe(true);
    expect(result.current.phase).toBe(STATES.PLAYING);
  });

  it("lands in the 3D room when WebGL is available", () => {
    const { result } = renderHook(() => useHypeCheck(TERMS, true));
    expect(result.current.mode).toBe("diorama");
    expect(result.current.dioramaFallback).toBe(false);
  });

  it("lands in the explore cloud with the flag raised when WebGL is missing", () => {
    // The default webgl arg runs the real capability check — false in jsdom.
    const { result } = renderHook(() => useHypeCheck(TERMS));
    expect(result.current.mode).toBe("explore");
    expect(result.current.dioramaFallback).toBe(true);
  });
});

describe("HypeCheck diorama entry (jsdom)", () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <HypeCheck />
      </MemoryRouter>
    );

  it("offers the 3D room option in the mode toggle", () => {
    renderPage();
    expect(
      screen.getByRole("button", { name: /3d room/i, pressed: false })
    ).toBeInTheDocument();
  });

  it("falls back to the explore cloud with a note when WebGL is missing", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /3d room/i }));
    // jsdom has no WebGL, so the room degrades to the 2D cloud…
    expect(await screen.findByRole("status")).toHaveTextContent(/webgl/i);
    // …with the full free-roam game intact, and Free-roam shown active.
    expect(
      screen.getByRole("button", { name: `“${TERMS[0].term}”` })
    ).toBeInTheDocument();
    expect(
      screen.getByText(`0 / ${TERMS.length} answered`)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /free-roam/i, pressed: true })
    ).toBeInTheDocument();
  });

  it("keeps free-roam progress across a fallback trip through the 3D toggle", async () => {
    renderPage();
    // Answer the first term in the landing free-roam cloud.
    const term = TERMS[0];
    fireEvent.click(screen.getByRole("button", { name: `“${term.term}”` }));
    await screen.findByRole("dialog");
    fireEvent.click(
      screen.getByRole("button", {
        name: CHOICES.find((c) => c.id === term.category).label,
      })
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /back to the cloud/i })
    );
    await screen.findByText(`1 / ${TERMS.length} answered`);

    // The 3D toggle falls back, but it's a stage swap — not a reset.
    fireEvent.click(screen.getByRole("button", { name: /3d room/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/webgl/i);
    expect(
      screen.getByText(`1 / ${TERMS.length} answered`)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `“${term.term}”` })).toBeDisabled();
  });
});
