import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ForcedChoice, { choiceStatement } from "../ForcedChoice";
import GuessTheNumber from "../GuessTheNumber";
import StatCard from "../StatCard";
import { SCENES } from "../scenes";
import { getFact } from "../facts";

const veldhoven = SCENES.find((s) => s.id === 2);

describe("ForcedChoice", () => {
  it("renders one real button and grays out the tombstones", () => {
    const onSelect = vi.fn();
    render(<ForcedChoice choice={veldhoven.choice} onSelect={onSelect} />);

    const asml = screen.getByRole("button", { name: /ASML/i });
    fireEvent.click(asml);
    expect(onSelect).toHaveBeenCalledWith("asml");

    // Nikon / Canon are tombstones, not buttons.
    expect(screen.queryByRole("button", { name: /Nikon/i })).toBeNull();
    expect(screen.getByText(/Nikon/i)).toBeInTheDocument();
  });

  it("shows the progress thread once selected", () => {
    render(<ForcedChoice choice={veldhoven.choice} selectedId="asml" onSelect={() => {}} />);
    expect(screen.getByText(veldhoven.choice.selectedText)).toBeInTheDocument();
  });

  it("renders a declarative statement under reduced motion", () => {
    render(<ForcedChoice choice={veldhoven.choice} onSelect={() => {}} reducedMotion />);
    expect(screen.getByText(/There is one option: ASML\./)).toBeInTheDocument();
    expect(choiceStatement(veldhoven.choice)).toMatch(/ASML/);
  });
});

describe("GuessTheNumber", () => {
  it("hides the truth until the guess is locked in, then reveals the sourced figure", () => {
    const fact = getFact(veldhoven.guess.factId);
    render(<GuessTheNumber guess={veldhoven.guess} fact={fact} />);

    expect(screen.queryByText("truth")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /lock in/i }));

    expect(screen.getByText("truth")).toBeInTheDocument();
    expect(screen.getByText(fact.value)).toBeInTheDocument();
  });
});

describe("StatCard", () => {
  it("withholds the value until flipped", () => {
    const fact = getFact("euv_units_2025");
    const { rerender } = render(<StatCard fact={fact} flipped={false} />);
    expect(screen.queryByText(fact.value)).toBeNull();

    rerender(<StatCard fact={fact} flipped />);
    expect(screen.getByText(fact.value)).toBeInTheDocument();
  });
});
