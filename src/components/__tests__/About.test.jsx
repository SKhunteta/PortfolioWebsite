import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import About from "../About";

describe("About", () => {
  it("renders the section title", () => {
    render(<About />);
    expect(screen.getByText("About Me")).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    render(<About />);
    expect(
      screen.getByText(/Get to know more about my background/)
    ).toBeInTheDocument();
  });

  it("renders the profile image", () => {
    render(<About />);
    const img = screen.getByAltText("Shreyans Khunteta");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/images/ShreyPic2.webp");
  });

  it('has the about section id', () => {
    const { container } = render(<About />);
    expect(container.querySelector("#about")).toBeInTheDocument();
  });

  it("mentions AI/ML pivot", () => {
    render(<About />);
    expect(screen.getByText(/AI\/ML/)).toBeInTheDocument();
  });

  it("mentions the grandmother quote", () => {
    render(<About />);
    expect(
      screen.getByText(/"A handsome young man" - my grandmother/)
    ).toBeInTheDocument();
  });

  it("mentions Seattle AI Book Club", () => {
    render(<About />);
    expect(screen.getByText(/Seattle AI Book Club/)).toBeInTheDocument();
  });
});
