import { describe, it, expect } from "vitest";
import {
  EXCERPT,
  EVENTS,
  EMOTIONS,
  TONE_EMOTION_TARGETS,
  SIM,
  END_SENTINEL_ID,
  formatUSD,
} from "../constants";

describe("MonetizedReader constants", () => {
  it("every paragraph has a unique id", () => {
    const ids = EXCERPT.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every non-break paragraph has non-empty text", () => {
    EXCERPT.filter((p) => p.type !== "scene-break").forEach((p) => {
      expect(typeof p.text).toBe("string");
      expect(p.text.length).toBeGreaterThan(0);
    });
  });

  it("every paragraph tone has emotion targets", () => {
    EXCERPT.forEach((p) => {
      expect(TONE_EMOTION_TARGETS[p.tone]).toBeDefined();
    });
  });

  it("every tone target covers every tracked emotion", () => {
    Object.values(TONE_EMOTION_TARGETS).forEach((targets) => {
      Object.keys(EMOTIONS).forEach((emotion) => {
        expect(typeof targets[emotion]).toBe("number");
      });
    });
  });

  it("every referenced event exists in EVENTS", () => {
    EXCERPT.forEach((p) => {
      (p.events ?? []).forEach((eventId) => {
        expect(EVENTS[eventId], `missing event ${eventId}`).toBeDefined();
      });
      if (p.lingerEvent) {
        expect(EVENTS[p.lingerEvent]).toBeDefined();
      }
    });
  });

  it("every sale event has positive units and price", () => {
    Object.values(EVENTS)
      .filter((e) => e.kind === "sale")
      .forEach((e) => {
        expect(e.units).toBeGreaterThan(0);
        expect(e.pricePerUnit).toBeGreaterThan(0);
        expect(typeof e.buyer).toBe("string");
      });
  });

  it("every event has a message", () => {
    Object.values(EVENTS).forEach((e) => {
      expect(typeof e.message).toBe("string");
      expect(e.message.length).toBeGreaterThan(0);
    });
  });

  it("market-dip events carry a dip factor and duration", () => {
    Object.values(EVENTS)
      .filter((e) => e.marketDip)
      .forEach((e) => {
        expect(e.marketDip).toBeGreaterThan(0);
        expect(e.marketDip).toBeLessThan(1);
        expect(e.dipDurationMs).toBeGreaterThan(0);
      });
  });

  it("the end sentinel id does not collide with a paragraph id", () => {
    expect(EXCERPT.some((p) => p.id === END_SENTINEL_ID)).toBe(false);
  });

  it("exports sane simulation tuning", () => {
    expect(SIM.TICK_MS).toBeGreaterThan(0);
    expect(SIM.BASE_RATE_PER_TICK).toBeGreaterThan(0);
    expect(SIM.HAPPINESS_THRESHOLD).toBeGreaterThan(0);
    expect(SIM.MAX_VISIBLE_ALERTS).toBeGreaterThan(0);
  });

  it("formats currency with two decimals", () => {
    expect(formatUSD(4.371)).toBe("$4.37");
    expect(formatUSD(0)).toBe("$0.00");
    expect(formatUSD(1234.5)).toBe("$1,234.50");
  });
});
