import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AIChipLife from "../index";
import { SCENES } from "../scenes";

describe("AIChipLife page", () => {
  it("renders every scene, the sources footer, and the author's note", () => {
    render(
      <MemoryRouter>
        <AIChipLife />
      </MemoryRouter>
    );

    for (const scene of SCENES) {
      expect(document.getElementById(scene.slug), scene.slug).not.toBeNull();
    }
    expect(screen.getByText(/Sources & verification/i)).toBeInTheDocument();
    expect(screen.getByText(/Shreyans Khunteta/)).toBeInTheDocument();
    expect(screen.getByText(/Contested figures, avoided/i)).toBeInTheDocument();
  });

  it("sets the route title and structured data", () => {
    render(
      <MemoryRouter>
        <AIChipLife />
      </MemoryRouter>
    );
    expect(document.title).toMatch(/The Life of an AI Chip/);
    expect(document.getElementById("ai-chip-jsonld")).not.toBeNull();
  });
});
