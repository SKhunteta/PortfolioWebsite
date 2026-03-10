import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LoadingState from "../LoadingState";

describe("LoadingState", () => {
  it("renders a status message from the rotation", () => {
    render(<LoadingState />);
    // The component starts at index 0: "Connecting to neural feeds"
    expect(
      screen.getByText("Connecting to neural feeds", { exact: false })
    ).toBeInTheDocument();
  });

  it("renders the terminal version label", () => {
    render(<LoadingState />);
    expect(screen.getByText("ELE Terminal v0.1")).toBeInTheDocument();
  });

  it("renders orbiting emotion icons", () => {
    const { container } = render(<LoadingState />);
    // Each emotion gets an orbiting icon wrapper with the orbit animation
    const orbitingIcons = container.querySelectorAll(".rounded-full.bg-white");
    expect(orbitingIcons.length).toBeGreaterThan(0);
  });

  it("renders the progress bar", () => {
    const { container } = render(<LoadingState />);
    const progressBar = container.querySelector(".transition-all.duration-300");
    expect(progressBar).toBeInTheDocument();
  });
});
