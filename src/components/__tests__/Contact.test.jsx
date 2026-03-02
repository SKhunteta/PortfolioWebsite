import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Contact from "../Contact";

describe("Contact", () => {
  it("renders the section title", () => {
    render(<Contact />);
    expect(screen.getByText("Let's Connect")).toBeInTheDocument();
  });

  it("renders the subtitle about LinkedIn", () => {
    render(<Contact />);
    expect(
      screen.getByText(/The best way to reach me is through LinkedIn/)
    ).toBeInTheDocument();
  });

  it("renders the LinkedIn CTA button", () => {
    render(<Contact />);
    expect(screen.getByText("Connect on LinkedIn")).toBeInTheDocument();
  });

  it("renders the GitHub CTA button", () => {
    render(<Contact />);
    expect(screen.getByText("Check out my GitHub")).toBeInTheDocument();
  });

  it("renders the profile image", () => {
    render(<Contact />);
    const img = screen.getByAltText("Shreyans Khunteta");
    expect(img).toBeInTheDocument();
  });

  it("renders contact interest areas", () => {
    render(<Contact />);
    expect(
      screen.getByText("New projects or collaborations")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Technical challenges/)
    ).toBeInTheDocument();
  });

  it('has the contact section id', () => {
    const { container } = render(<Contact />);
    expect(container.querySelector("#contact")).toBeInTheDocument();
  });
});
