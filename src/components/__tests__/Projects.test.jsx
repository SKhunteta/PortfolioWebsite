import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Projects from "../Projects";

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("Projects", () => {
  it("renders the section title", () => {
    renderWithRouter(<Projects />);
    expect(screen.getByText("My Projects")).toBeInTheDocument();
  });

  it("renders featured project badges", () => {
    renderWithRouter(<Projects />);
    const badges = screen.getAllByText("Featured Project");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("renders project titles", () => {
    renderWithRouter(<Projects />);
    expect(
      screen.getAllByText("Portfolio Website & MCP Server").length
    ).toBeGreaterThan(0);
    expect(screen.getByText("Lingua AI Chatbot")).toBeInTheDocument();
  });

  it("renders technology tags", () => {
    renderWithRouter(<Projects />);
    expect(screen.getAllByText("React").length).toBeGreaterThanOrEqual(1);
  });

  it("renders GitHub links for projects that have them", () => {
    renderWithRouter(<Projects />);
    const sourceLinks = screen.getAllByText("Source Code");
    expect(sourceLinks.length).toBeGreaterThan(0);
  });

  it('has the projects section id', () => {
    const { container } = renderWithRouter(<Projects />);
    expect(container.querySelector("#projects")).toBeInTheDocument();
  });

  it("renders Coming Soon status for applicable projects", () => {
    renderWithRouter(<Projects />);
    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
  });

  it("renders regular (non-featured) project cards", () => {
    renderWithRouter(<Projects />);
    expect(
      screen.getByText("Healthcare Data Pipeline")
    ).toBeInTheDocument();
    expect(screen.getByText("Loan Origination System")).toBeInTheDocument();
  });
});
