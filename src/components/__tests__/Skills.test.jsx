import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Skills from "../Skills";

describe("Skills", () => {
  it("renders the section title", () => {
    render(<Skills />);
    expect(screen.getByText("Skills & Expertise")).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    render(<Skills />);
    expect(
      screen.getByText(/My technical toolkit/)
    ).toBeInTheDocument();
  });

  it("renders all skill categories", () => {
    render(<Skills />);
    expect(screen.getByText("Languages & Frameworks")).toBeInTheDocument();
    expect(screen.getByText("Frontend Development")).toBeInTheDocument();
    expect(screen.getByText("Cloud & DevOps")).toBeInTheDocument();
    expect(screen.getByText("Databases & Data")).toBeInTheDocument();
    expect(screen.getByText("Artificial Intelligence")).toBeInTheDocument();
  });

  it("renders specific skills", () => {
    render(<Skills />);
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("Azure")).toBeInTheDocument();
    expect(screen.getByText("Docker")).toBeInTheDocument();
    expect(screen.getByText("PyTorch")).toBeInTheDocument();
  });

  it('has the skills section id', () => {
    const { container } = render(<Skills />);
    expect(container.querySelector("#skills")).toBeInTheDocument();
  });

  it("renders the skills image", () => {
    render(<Skills />);
    const img = screen.getByAltText(
      "Illustrated portrait of Shreyans Khunteta with his black cat"
    );
    expect(img).toBeInTheDocument();
  });
});
