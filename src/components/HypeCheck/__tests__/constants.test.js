import { describe, it, expect } from "vitest";
import {
  TERMS,
  TIERS,
  CHOICES,
  CHOICE_LABELS,
  OVERWHELM,
  CLOUD_WORDS,
  CLOUD_SIZES,
  explorePositionFor,
} from "../constants";

const CATEGORIES = ["alive", "dead", "fake"];

describe("Hype Check TERMS dataset", () => {
  it("has a playable number of terms", () => {
    expect(TERMS.length).toBeGreaterThanOrEqual(15);
    expect(TERMS.length).toBeLessThanOrEqual(25);
  });

  it("gives every term the full card schema", () => {
    for (const term of TERMS) {
      expect(term.id).toMatch(/^[a-z0-9-]+$/);
      expect(term.term.length).toBeGreaterThan(0);
      expect(CATEGORIES).toContain(term.category);
      expect(term.verdictLabel.length).toBeGreaterThan(0);
      expect(term.fact.length).toBeGreaterThan(20);
      expect(term.fact.length).toBeLessThanOrEqual(320);
      expect(term.factDate.length).toBeGreaterThan(0);
    }
  });

  it("cites sources for every real term, and none for fakes", () => {
    for (const term of TERMS) {
      if (term.category === "fake") {
        // Invented terms have nothing to cite.
        expect(term.sources).toBeUndefined();
        continue;
      }
      expect(Array.isArray(term.sources)).toBe(true);
      expect(term.sources.length).toBeGreaterThanOrEqual(1);
      expect(term.sources.length).toBeLessThanOrEqual(2);
      for (const source of term.sources) {
        expect(source.label.length).toBeGreaterThan(0);
        expect(source.url).toMatch(/^https:\/\//);
      }
    }
  });

  it("has unique ids and terms", () => {
    expect(new Set(TERMS.map((t) => t.id)).size).toBe(TERMS.length);
    expect(new Set(TERMS.map((t) => t.term)).size).toBe(TERMS.length);
  });

  it("keeps all three categories represented", () => {
    for (const category of CATEGORIES) {
      expect(
        TERMS.filter((t) => t.category === category).length
      ).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("Hype Check choices and tiers", () => {
  it("offers one choice per category", () => {
    expect(CHOICES.map((c) => c.id).sort()).toEqual([...CATEGORIES].sort());
    for (const choice of CHOICES) {
      expect(CHOICE_LABELS[choice.id]).toBe(choice.label);
    }
  });

  it("covers every possible score with a tier", () => {
    const mins = TIERS.map((t) => t.min);
    expect(Math.min(...mins)).toBe(0);
    for (let score = 0; score <= TERMS.length; score += 1) {
      expect(TIERS.some((tier) => score >= tier.min)).toBe(true);
    }
    // Tiers are declared highest-first so a top-down find() works.
    expect([...mins].sort((a, b) => b - a)).toEqual(mins);
  });

  it("keeps the overwhelm meter tunings coherent", () => {
    expect(OVERWHELM.START).toBeGreaterThanOrEqual(OVERWHELM.MIN);
    expect(OVERWHELM.START).toBeLessThanOrEqual(OVERWHELM.MAX);
    expect(OVERWHELM.CORRECT_DELTA).toBeLessThan(0);
    expect(OVERWHELM.WRONG_DELTA).toBeGreaterThan(0);
    expect(OVERWHELM.RISING_AT).toBeLessThan(OVERWHELM.OVERLOAD_AT);
  });
});

describe("Hype Check explore layout", () => {
  it("is deterministic and keeps every term on the stage", () => {
    for (let i = 0; i < TERMS.length; i += 1) {
      const pos = explorePositionFor(i);
      // Same index, same position — no randomness at render time.
      expect(explorePositionFor(i)).toEqual(pos);
      expect(pos.top).toBeGreaterThanOrEqual(0);
      expect(pos.top).toBeLessThanOrEqual(90);
      expect(pos.left).toBeGreaterThanOrEqual(0);
      // Leave ≥30% of the stage width so buttons never overflow.
      expect(pos.left).toBeLessThanOrEqual(70);
    }
  });

  it("never stacks two terms on the same spot", () => {
    const seen = new Set();
    for (let i = 0; i < TERMS.length; i += 1) {
      const { top, left } = explorePositionFor(i);
      seen.add(`${top}:${left}`);
    }
    expect(seen.size).toBe(TERMS.length);
  });
});

describe("Hype Check word cloud", () => {
  it("positions every decorative word on the stage with a known size", () => {
    for (const word of CLOUD_WORDS) {
      expect(word.top).toBeGreaterThanOrEqual(0);
      expect(word.top).toBeLessThanOrEqual(100);
      expect(word.left).toBeGreaterThanOrEqual(0);
      expect(word.left).toBeLessThanOrEqual(100);
      expect(CLOUD_SIZES[word.size]).toBeDefined();
    }
  });
});
