import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Experience from "../Experience";

describe("Experience", () => {
  it("renders the section title", () => {
    render(<Experience />);
    expect(screen.getByText("Work Experience")).toBeInTheDocument();
  });

  it("renders all companies", () => {
    render(<Experience />);
    expect(screen.getByText(/Careismatic Brands/)).toBeInTheDocument();
    expect(screen.getByText(/Southeast Bank/)).toBeInTheDocument();
    expect(screen.getByText(/Moxe Health/)).toBeInTheDocument();
    expect(screen.getByText(/PacificSource Health Plans/)).toBeInTheDocument();
    expect(screen.getByText(/COVID Response Collective/)).toBeInTheDocument();
  });

  it("renders 5 experience entries", () => {
    render(<Experience />);
    const positions = screen.getAllByText(/Senior Software Engineer|Software Engineer|Backend Software Developer|Founder/);
    expect(positions.length).toBe(5);
  });

  it("renders locations", () => {
    render(<Experience />);
    const seattleLocations = screen.getAllByText(/Seattle, WA/);
    expect(seattleLocations.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Tacoma, WA/)).toBeInTheDocument();
  });

  it("renders description bullet points", () => {
    render(<Experience />);
    expect(
      screen.getByText(/Leading Microsoft Dynamics 365/)
    ).toBeInTheDocument();
  });

  it('has the experience section id', () => {
    const { container } = render(<Experience />);
    expect(container.querySelector("#experience")).toBeInTheDocument();
  });
});
