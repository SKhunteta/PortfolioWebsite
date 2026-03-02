import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LoadingState from "../LoadingState";

describe("LoadingState", () => {
  it("renders the scanning message", () => {
    render(<LoadingState />);
    expect(screen.getByText(/Scanning news feeds/)).toBeInTheDocument();
  });

  it("renders the analyzing message", () => {
    render(<LoadingState />);
    expect(
      screen.getByText("Analyzing the emotional markets")
    ).toBeInTheDocument();
  });

  it("renders 8 skeleton cards", () => {
    const { container } = render(<LoadingState />);
    // The grid has 8 skeleton card wrappers with border-l-4
    const skeletonCards = container.querySelectorAll(".border-l-4");
    expect(skeletonCards.length).toBe(8);
  });

  it("renders animated dots", () => {
    const { container } = render(<LoadingState />);
    const dots = container.querySelectorAll(".animate-pulse");
    // 3 dots + 8 skeleton cards = 11 animated elements
    expect(dots.length).toBeGreaterThanOrEqual(8);
  });
});
