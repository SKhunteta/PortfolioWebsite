import { describe, it, expect } from "vitest";
import { SCENES, ASSEMBLY_ORDER } from "../scenes";

const enabledCount = (scene) => (scene.choice ? scene.choice.options.filter((o) => o.enabled).length : 0);

describe("scene structure (the thesis is the mechanic)", () => {
  it("has exactly eight scenes in order", () => {
    expect(SCENES).toHaveLength(8);
    SCENES.forEach((s, i) => expect(s.id).toBe(i + 1));
  });

  it("scene 1 is the one genuinely plural choice", () => {
    const design = SCENES.find((s) => s.id === 1);
    expect(design.choice.plural).toBe(true);
    expect(enabledCount(design)).toBeGreaterThan(1);
  });

  it("monopoly chokepoints (scenes 2, 3, 4, 6) each present exactly one live option", () => {
    for (const id of [2, 3, 4, 6]) {
      const scene = SCENES.find((s) => s.id === id);
      expect(enabledCount(scene), `scene ${id}`).toBe(1);
    }
  });

  it("scene 5 is the honest three-option oligopoly", () => {
    const memory = SCENES.find((s) => s.id === 5);
    expect(memory.choice.oligopoly).toBe(true);
    expect(enabledCount(memory)).toBe(3);
  });

  it("scene 8 has zero interactive elements (the withdrawal is the point)", () => {
    const quincy = SCENES.find((s) => s.id === 8);
    expect(quincy.still).toBe(true);
    expect(quincy.choice).toBeUndefined();
    expect(quincy.guess).toBeUndefined();
  });

  it("uses 3 guess-the-number interactions, sparingly", () => {
    const guesses = SCENES.filter((s) => s.guess);
    expect(guesses).toHaveLength(3);
  });

  it("the chip assembly accretes unique parts and ships by scene 7", () => {
    const parts = SCENES.map((s) => s.part).filter(Boolean);
    expect(new Set(parts).size).toBe(parts.length); // no duplicates
    parts.forEach((p) => expect(ASSEMBLY_ORDER).toContain(p));
    expect(SCENES.find((s) => s.id === 7).part).toBe("crate");
  });

  it("the single acknowledgment line lives in the packaging scene", () => {
    const ack = SCENES.filter((s) => s.choice && s.choice.acknowledgment);
    expect(ack).toHaveLength(1);
    expect(ack[0].id).toBe(6);
  });
});
