import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "../Footer";

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("Footer", () => {
  it("renders the name/brand", () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText("Shreyans Khunteta")).toBeInTheDocument();
  });

  it("renders quick links", () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText("Quick Links")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Resume")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
  });

  it("renders Get In Touch heading", () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText("Get In Touch")).toBeInTheDocument();
  });

  it("renders social links with aria labels", () => {
    renderWithRouter(<Footer />);
    expect(screen.getByLabelText("LinkedIn")).toBeInTheDocument();
    expect(screen.getByLabelText("GitHub")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("renders the email address", () => {
    renderWithRouter(<Footer />);
    expect(
      screen.getByText("shreyans.khunteta@gmail.com")
    ).toBeInTheDocument();
  });

  it("renders the current year in copyright", () => {
    renderWithRouter(<Footer />);
    const year = new Date().getFullYear();
    expect(
      screen.getByText(new RegExp(`© ${year}`))
    ).toBeInTheDocument();
  });

  it("credits React & Vite", () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText(/React & Vite/)).toBeInTheDocument();
  });
});
