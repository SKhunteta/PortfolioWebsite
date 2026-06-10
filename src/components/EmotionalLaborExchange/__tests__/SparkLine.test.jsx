import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import SparkLine from "../SparkLine";

describe("SparkLine", () => {
  it("renders a dashed line when data has fewer than 2 points", () => {
    const { container } = render(<SparkLine data={[5]} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-label", "Insufficient price history");

    const line = container.querySelector("line");
    expect(line).toBeInTheDocument();
    expect(line).toHaveAttribute("stroke-dasharray", "4 3");
  });

  it("renders a dashed line when data is null", () => {
    const { container } = render(<SparkLine data={null} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-label", "Insufficient price history");
  });

  it("renders a dashed line when data is empty", () => {
    const { container } = render(<SparkLine data={[]} />);
    const line = container.querySelector("line");
    expect(line).toBeInTheDocument();
  });

  it("renders a polyline when data has 2+ points", () => {
    const data = [10, 20, 15, 25];
    const { container } = render(<SparkLine data={data} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-label", "Price trend sparkline");

    const polyline = container.querySelector("polyline");
    expect(polyline).toBeInTheDocument();
    expect(polyline).toHaveAttribute("points");
  });

  it("applies custom color", () => {
    const { container } = render(
      <SparkLine data={[10, 20]} color="#FF0000" />
    );
    const polyline = container.querySelector("polyline");
    expect(polyline).toHaveAttribute("stroke", "#FF0000");
  });

  it("applies custom dimensions", () => {
    const { container } = render(
      <SparkLine data={[10, 20]} width={120} height={40} />
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "120");
    expect(svg).toHaveAttribute("height", "40");
  });

  it("uses default color when none specified", () => {
    const { container } = render(<SparkLine data={[10, 20]} />);
    const polyline = container.querySelector("polyline");
    expect(polyline).toHaveAttribute("stroke", "#6B6B6B");
  });

  it("handles flat data (all same values)", () => {
    const { container } = render(<SparkLine data={[5, 5, 5]} />);
    const polyline = container.querySelector("polyline");
    expect(polyline).toBeInTheDocument();
  });

  it("has correct svg role for accessibility", () => {
    const { container } = render(<SparkLine data={[10, 20]} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("role", "img");
  });
});
