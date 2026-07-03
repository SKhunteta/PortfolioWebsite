import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlaygroundPage from "../PlaygroundPage";
import { DEMOS, HAPPINESS_LIABILITY_SERIES } from "../../data/demos";

const renderPage = () =>
  render(
    <MemoryRouter>
      <PlaygroundPage />
    </MemoryRouter>
  );

describe("PlaygroundPage", () => {
  it("renders a card linking to every demo", () => {
    renderPage();
    for (const demo of DEMOS) {
      const links = screen
        .getAllByRole("link")
        .filter((el) => el.getAttribute("href") === demo.route);
      expect(links.length).toBeGreaterThan(0);
    }
  });

  it("groups the emotional-labor demos under the series heading", () => {
    renderPage();
    expect(
      screen.getByText(HAPPINESS_LIABILITY_SERIES.title)
    ).toBeInTheDocument();
  });

  it("renders the Meridian in-world artifact card in the series section", () => {
    renderPage();
    expect(screen.getByText("Meridian — Careers")).toBeInTheDocument();
    const links = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("href") === "/meridian/");
    expect(links.length).toBeGreaterThan(0);
  });

  it("renders the You Are Here in-world artifact card in the series section", () => {
    renderPage();
    expect(screen.getByText("You Are Here")).toBeInTheDocument();
    const links = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("href") === "/you-are-here/");
    expect(links.length).toBeGreaterThan(0);
  });

  it("renders a view-source link for every demo", () => {
    renderPage();
    const sourceLinks = screen.getAllByLabelText(/View source for/);
    expect(sourceLinks).toHaveLength(DEMOS.length);
    for (const link of sourceLinks) {
      expect(link.getAttribute("href")).toMatch(
        /^https:\/\/github\.com\/SKhunteta\/PortfolioWebsite\/tree\/main\/src\/components\//
      );
    }
  });
});
