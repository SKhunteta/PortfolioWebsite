import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Hero from "../Hero";

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("Hero", () => {
  it("renders the name", () => {
    renderWithRouter(<Hero />);
    expect(screen.getByText("Shreyans Khunteta")).toBeInTheDocument();
  });

  it("renders the role badge", () => {
    renderWithRouter(<Hero />);
    expect(screen.getByText("Senior Software Engineer")).toBeInTheDocument();
  });

  it("renders the tagline", () => {
    renderWithRouter(<Hero />);
    expect(
      screen.getByText(/Building innovative solutions/)
    ).toBeInTheDocument();
  });

  it("renders the CTA buttons", () => {
    renderWithRouter(<Hero />);
    expect(screen.getByText("Get In Touch")).toBeInTheDocument();
    expect(screen.getByText("View Projects")).toBeInTheDocument();
  });

  it("renders the profile image", () => {
    renderWithRouter(<Hero />);
    const img = screen.getByAltText("Shreyans Khunteta");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/images/ShreyPic1.jpg");
  });

  it("renders social links with correct aria labels", () => {
    renderWithRouter(<Hero />);
    expect(screen.getByLabelText("LinkedIn")).toBeInTheDocument();
    expect(screen.getByLabelText("GitHub")).toBeInTheDocument();
  });

  it('has the home section id for navigation', () => {
    const { container } = renderWithRouter(<Hero />);
    expect(container.querySelector("#home")).toBeInTheDocument();
  });

  it("renders the scroll down prompt", () => {
    renderWithRouter(<Hero />);
    expect(screen.getByText("Scroll Down")).toBeInTheDocument();
  });
});
