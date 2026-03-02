import { describe, it, expect } from "vitest";
import { EMOTIONS, EMOTION_ORDER, getSignalStyle } from "../constants";

describe("ELE Constants", () => {
  describe("EMOTIONS", () => {
    it("defines all 8 emotions", () => {
      expect(Object.keys(EMOTIONS)).toHaveLength(8);
    });

    it("has all required fields for each emotion", () => {
      for (const [key, emotion] of Object.entries(EMOTIONS)) {
        expect(emotion).toHaveProperty("name");
        expect(emotion).toHaveProperty("icon");
        expect(emotion).toHaveProperty("accentColor");
        expect(emotion).toHaveProperty("description");
        expect(typeof emotion.name).toBe("string");
        expect(typeof emotion.icon).toBe("string");
        expect(emotion.accentColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(typeof emotion.description).toBe("string");
        expect(emotion.description.length).toBeGreaterThan(0);
      }
    });

    it("contains the expected emotion keys", () => {
      const expectedKeys = [
        "joy",
        "grief",
        "rage",
        "hope",
        "anxiety",
        "empathy",
        "apathy",
        "outrage",
      ];
      expectedKeys.forEach((key) => {
        expect(EMOTIONS).toHaveProperty(key);
      });
    });
  });

  describe("EMOTION_ORDER", () => {
    it("contains 8 entries", () => {
      expect(EMOTION_ORDER).toHaveLength(8);
    });

    it("matches the keys in EMOTIONS", () => {
      EMOTION_ORDER.forEach((key) => {
        expect(EMOTIONS).toHaveProperty(key);
      });
    });

    it("contains no duplicates", () => {
      const unique = new Set(EMOTION_ORDER);
      expect(unique.size).toBe(EMOTION_ORDER.length);
    });
  });

  describe("getSignalStyle", () => {
    it("returns buy style for BUY signal", () => {
      const result = getSignalStyle("BUY");
      expect(result).toContain("text-ele-up");
      expect(result).toContain("border-ele-up");
    });

    it("returns buy style for lowercase buy signal", () => {
      const result = getSignalStyle("buy");
      expect(result).toContain("text-ele-up");
    });

    it("returns sell style for SELL signal", () => {
      const result = getSignalStyle("SELL");
      expect(result).toContain("text-ele-down");
      expect(result).toContain("border-ele-down");
    });

    it("returns hold style for HOLD signal", () => {
      const result = getSignalStyle("HOLD");
      expect(result).toContain("text-ele-text-tertiary");
    });

    it("returns default hold style for unknown signal", () => {
      const result = getSignalStyle("UNKNOWN");
      expect(result).toContain("text-ele-text-tertiary");
    });

    it("returns default style for null", () => {
      const result = getSignalStyle(null);
      expect(result).toContain("text-ele-text-tertiary");
    });

    it("returns default style for undefined", () => {
      const result = getSignalStyle(undefined);
      expect(result).toContain("text-ele-text-tertiary");
    });
  });
});
