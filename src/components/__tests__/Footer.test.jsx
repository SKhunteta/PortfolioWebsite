import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "../Footer";

describe("Footer", () => {
  it("renders the name/brand", () => {
    render(<Footer />);
    expect(screen.getByText("Shreyans Khunteta")).toBeInTheDocument();
  });

  it("renders quick links", () => {
    render(<Footer />);
    expect(screen.getByText("Quick Links")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Experience")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
  });

  it("renders Get In Touch heading", () => {
    render(<Footer />);
    expect(screen.getByText("Get In Touch")).toBeInTheDocument();
  });

  it("renders social links with aria labels", () => {
    render(<Footer />);
    expect(screen.getByLabelText("LinkedIn")).toBeInTheDocument();
    expect(screen.getByLabelText("GitHub")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("renders the email address", () => {
    render(<Footer />);
    expect(
      screen.getByText("shreyans.khunteta@gmail.com")
    ).toBeInTheDocument();
  });

  it("renders the current year in copyright", () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(
      screen.getByText(new RegExp(`© ${year}`))
    ).toBeInTheDocument();
  });

  it("credits React & Vite", () => {
    render(<Footer />);
    expect(screen.getByText(/React & Vite/)).toBeInTheDocument();
  });
});
