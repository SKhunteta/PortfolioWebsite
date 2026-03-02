import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AtlasHeader from "../AtlasHeader";

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("AtlasHeader", () => {
  it("renders the title", () => {
    renderWithRouter(<AtlasHeader />);
    expect(
      screen.getByText("The Aaron West Lyric Atlas")
    ).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    renderWithRouter(<AtlasHeader />);
    expect(
      screen.getByText("41 places. Five records. One story.")
    ).toBeInTheDocument();
  });

  it("renders a back link to home", () => {
    renderWithRouter(<AtlasHeader />);
    const backLink = screen.getByText(/Back/);
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest("a")).toHaveAttribute("href", "/");
  });
});
