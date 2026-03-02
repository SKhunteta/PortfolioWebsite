import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import VolatilityBar from "../VolatilityBar";

describe("VolatilityBar", () => {
  it("renders the volatility label", () => {
    render(<VolatilityBar value={50} />);
    expect(screen.getByText("Volatility Index")).toBeInTheDocument();
  });

  it("displays the clamped value", () => {
    render(<VolatilityBar value={50} />);
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("clamps values below 0 to 0", () => {
    render(<VolatilityBar value={-10} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("clamps values above 100 to 100", () => {
    render(<VolatilityBar value={150} />);
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("uses green color for low volatility (< 30)", () => {
    const { container } = render(<VolatilityBar value={20} />);
    const bar = container.querySelector(".bg-emerald-500");
    expect(bar).toBeInTheDocument();
  });

  it("uses amber color for medium volatility (30-59)", () => {
    const { container } = render(<VolatilityBar value={45} />);
    const bar = container.querySelector(".bg-amber-500");
    expect(bar).toBeInTheDocument();
  });

  it("uses red color for high volatility (>= 60)", () => {
    const { container } = render(<VolatilityBar value={75} />);
    const bar = container.querySelector(".bg-red-500");
    expect(bar).toBeInTheDocument();
  });

  it("defaults to 0 when no value prop is provided", () => {
    render(<VolatilityBar />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("sets the bar width via inline style", () => {
    const { container } = render(<VolatilityBar value={65} />);
    const innerBar = container.querySelector("[style]");
    expect(innerBar.style.width).toBe("65%");
  });
});
