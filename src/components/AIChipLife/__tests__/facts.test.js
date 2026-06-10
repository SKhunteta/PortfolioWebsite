import { describe, it, expect } from "vitest";
import { FACTS, getFact } from "../facts";
import { SCENES } from "../scenes";

const REQUIRED = ["id", "label", "value", "source", "verified", "confidence"];
const CONFIDENCES = ["verified", "order_of_magnitude", "analyst_estimate", "needs_verification"];

describe("facts schema", () => {
  it("every fact has the required schema fields", () => {
    for (const [key, fact] of Object.entries(FACTS)) {
      expect(fact.id, `${key} id`).toBe(key);
      for (const field of REQUIRED) {
        expect(fact[field], `${key}.${field}`).not.toBeUndefined();
      }
      expect(CONFIDENCES, `${key}.confidence`).toContain(fact.confidence);
    }
  });

  it("unverified facts are flagged and carry no verified date", () => {
    for (const fact of Object.values(FACTS)) {
      if (fact.confidence === "needs_verification") {
        expect(fact.verified, `${fact.id}`).toBe(false);
        expect(fact.verifiedDate, `${fact.id}`).toBeNull();
      }
      if (fact.verified) {
        expect(fact.verifiedDate, `${fact.id}`).toBeTruthy();
      }
    }
  });

  it("analyst estimates are attributed", () => {
    for (const fact of Object.values(FACTS)) {
      if (fact.confidence === "analyst_estimate") {
        expect(fact.attribution, `${fact.id}`).toBeTruthy();
      }
    }
  });

  it("getFact throws on an unknown id", () => {
    expect(() => getFact("does_not_exist")).toThrow();
  });

  it("every fact referenced by a scene (stat card or guess) resolves", () => {
    for (const scene of SCENES) {
      for (const id of scene.facts || []) {
        expect(() => getFact(id), `${scene.slug} fact ${id}`).not.toThrow();
      }
      if (scene.guess) {
        expect(() => getFact(scene.guess.factId), `${scene.slug} guess`).not.toThrow();
      }
    }
  });
});
