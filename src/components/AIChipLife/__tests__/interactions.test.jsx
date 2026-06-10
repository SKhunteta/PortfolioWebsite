import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ForcedChoice, { choiceStatement } from "../ForcedChoice";
import GuessTheNumber from "../GuessTheNumber";
import StatCard from "../StatCard";
import RecapCard, { verdict } from "../RecapCard";
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

  it("reports the locked guess upward for the epilogue recap", () => {
    const fact = getFact(veldhoven.guess.factId);
    const onReveal = vi.fn();
    render(<GuessTheNumber guess={veldhoven.guess} fact={fact} onReveal={onReveal} />);

    fireEvent.click(screen.getByRole("button", { name: /lock in/i }));
    expect(onReveal).toHaveBeenCalledWith(
      expect.objectContaining({ factId: fact.id, truth: fact.numeric })
    );
  });

  it("scales the truth into slider units when the guess declares a factScale", () => {
    const oberkochen = SCENES.find((s) => s.id === 3);
    const fact = getFact(oberkochen.guess.factId);
    const onReveal = vi.fn();
    render(<GuessTheNumber guess={oberkochen.guess} fact={fact} onReveal={onReveal} />);

    fireEvent.click(screen.getByRole("button", { name: /lock in/i }));
    expect(onReveal).toHaveBeenCalledWith(
      expect.objectContaining({ truth: fact.numeric / oberkochen.guess.factScale })
    );
  });
});

describe("RecapCard", () => {
  it("renders nothing when no guesses were locked in", () => {
    const { container } = render(<RecapCard entries={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows each guess against the truth with a verdict", () => {
    render(
      <RecapCard
        entries={[{ factId: "euv_units_2025", guessed: 200, truth: 48, kind: "count", unit: "units" }]}
      />
    );
    expect(screen.getByText(/200 units/)).toBeInTheDocument();
    expect(screen.getByText(/4x too high/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
  });

  it("calls a guess within 15% close", () => {
    expect(verdict(50, 48)).toBe("close");
    expect(verdict(12, 48)).toBe("4x too low");
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
