import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navbar from "../navbar";

const renderWithRouter = (ui, { route = "/" } = {}) =>
  render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);

describe("Navbar", () => {
  it("renders the brand name", () => {
    renderWithRouter(<Navbar />);
    const brandNames = screen.getAllByText("Shreyans Khunteta");
    expect(brandNames.length).toBeGreaterThanOrEqual(1);
  });

  it("renders all navigation links", () => {
    renderWithRouter(<Navbar />);
    expect(screen.getAllByText("Home").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("About").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Experience").length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Skills").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Projects").length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("AI Chat").length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Contact").length
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders external page links", () => {
    renderWithRouter(<Navbar />);
    const blogLinks = screen.getAllByText("Blog");
    expect(blogLinks.length).toBeGreaterThanOrEqual(1);

    const storiesLinks = screen.getAllByText("Stories");
    expect(storiesLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("renders social links in mobile menu", () => {
    renderWithRouter(<Navbar />);
    expect(screen.getByLabelText("LinkedIn")).toBeInTheDocument();
    expect(screen.getByLabelText("GitHub")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("has a close button with aria label", () => {
    renderWithRouter(<Navbar />);
    expect(screen.getByLabelText("Close menu")).toBeInTheDocument();
  });

  it("renders anchor links when on the home page", () => {
    renderWithRouter(<Navbar />, { route: "/" });
    // Desktop nav renders anchor links with href="#home", "#about" etc.
    const homeLinks = screen.getAllByText("Home");
    const homeAnchor = homeLinks.find((el) => {
      const anchor = el.closest("a");
      return anchor && anchor.getAttribute("href") === "#home";
    });
    expect(homeAnchor).toBeDefined();
  });
});
