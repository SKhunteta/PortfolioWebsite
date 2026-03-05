import { describe, it, expect } from "vitest";
import {
  GENRES,
  GENRE_LABELS,
  GENRE_GRADIENTS,
  GENRE_ACCENT_COLORS,
  MOODS,
  STORAGE_KEYS,
  DEFAULT_PREFERENCES,
} from "../constants";

describe("PlotTwist constants", () => {
  it("exports GENRES as a non-empty array starting with 'all'", () => {
    expect(Array.isArray(GENRES)).toBe(true);
    expect(GENRES.length).toBeGreaterThan(1);
    expect(GENRES[0]).toBe("all");
  });

  it("has a label for every genre", () => {
    GENRES.forEach((genre) => {
      expect(GENRE_LABELS[genre]).toBeDefined();
      expect(typeof GENRE_LABELS[genre]).toBe("string");
    });
  });

  it("has a gradient for every genre except 'all'", () => {
    GENRES.filter((g) => g !== "all").forEach((genre) => {
      expect(GENRE_GRADIENTS[genre]).toBeDefined();
      expect(GENRE_GRADIENTS[genre]).toContain("from-");
    });
  });

  it("has an accent color for every genre except 'all'", () => {
    GENRES.filter((g) => g !== "all").forEach((genre) => {
      expect(GENRE_ACCENT_COLORS[genre]).toBeDefined();
      expect(GENRE_ACCENT_COLORS[genre]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it("exports MOODS as a non-empty array of strings", () => {
    expect(Array.isArray(MOODS)).toBe(true);
    expect(MOODS.length).toBeGreaterThan(0);
    MOODS.forEach((mood) => expect(typeof mood).toBe("string"));
  });

  it("exports STORAGE_KEYS with required keys", () => {
    expect(STORAGE_KEYS.preferences).toBe("plottwist-preferences");
    expect(STORAGE_KEYS.saved).toBe("plottwist-saved");
    expect(STORAGE_KEYS.visited).toBe("plottwist-visited");
  });

  it("exports DEFAULT_PREFERENCES with empty maps", () => {
    expect(DEFAULT_PREFERENCES).toEqual({
      likedGenres: {},
      dislikedGenres: {},
      likedTags: {},
      dislikedTags: {},
    });
  });
});
