import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HypeCheck from "..";
import { TERMS, CHOICES, KNOWLEDGE_CUTOFF } from "../constants";

const renderPage = () =>
  render(
    <MemoryRouter>
      <HypeCheck />
    </MemoryRouter>
  );

const termButtonName = (term) => `“${term.term}”`;

// AnimatePresence exit animations are asynchronous even in jsdom, so all
// phase changes are awaited via findBy* queries.
const switchToQuiz = async () => {
  fireEvent.click(screen.getByRole("button", { name: /^quiz$/i }));
  return screen.findByRole("heading", { level: 2 });
};

const currentTermFrom = (heading) => {
  const termText = heading.textContent.replace(/[“”]/g, "");
  const term = TERMS.find((t) => t.term === termText);
  expect(term).toBeDefined();
  return term;
};

// Answer the current quiz round correctly and advance. Returns whether
// that was the final round.
const playOneRound = async (heading) => {
  const term = currentTermFrom(heading);
  const choice = CHOICES.find((c) => c.id === term.category);
  fireEvent.click(screen.getByRole("button", { name: choice.label }));

  const nextButton = await screen.findByRole("button", {
    name: /next term|see the damage/i,
  });
  const isLast = /see the damage/i.test(nextButton.textContent);
  fireEvent.click(nextButton);
  return isLast;
};

describe("HypeCheck page", () => {
  it("lands directly in free-roam with the framing blurb and mode toggle", () => {
    renderPage();
    expect(document.title).toContain("Hype Check");
    // The compact framing replaces the old intro page.
    expect(screen.getByText(/one year after the timeline/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to portfolio/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view source on github/i })
    ).toBeInTheDocument();

    // The segmented mode control, free-roam active by default.
    const group = screen.getByRole("group", { name: /game mode/i });
    expect(group).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /free-roam/i, pressed: true })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^quiz$/i, pressed: false })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /3d room/i, pressed: false })
    ).toBeInTheDocument();

    // The explore cloud is already live — no intro page, no meme image.
    expect(
      screen.getByRole("button", { name: termButtonName(TERMS[0]) })
    ).toBeEnabled();
    expect(screen.getByText(`0 / ${TERMS.length} answered`)).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /may 2025/i })).not.toBeInTheDocument();
    // No quiz verdict buttons floating outside a popup.
    expect(
      screen.queryByRole("button", { name: CHOICES[0].label })
    ).not.toBeInTheDocument();
  });

  it("switches to the quiz with the three verdict buttons and the meter", async () => {
    renderPage();
    await switchToQuiz();
    for (const choice of CHOICES) {
      expect(
        screen.getByRole("button", { name: choice.label })
      ).toBeInTheDocument();
    }
    expect(
      screen.getByRole("meter", { name: /overwhelm/i })
    ).toBeInTheDocument();
    expect(screen.getByText(`1 / ${TERMS.length}`)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^quiz$/i, pressed: true })
    ).toBeInTheDocument();
  });

  it("reveals a fact card after answering", async () => {
    renderPage();
    const heading = await switchToQuiz();
    const term = currentTermFrom(heading);

    fireEvent.click(
      screen.getByRole("button", {
        name: CHOICES.find((c) => c.id === term.category).label,
      })
    );

    expect(await screen.findByText(term.fact)).toBeInTheDocument();
    expect(screen.getByText(/correct/i)).toBeInTheDocument();
    expect(screen.getByText(term.verdictLabel)).toBeInTheDocument();
  });

  it("plays through every quiz round to the end screen and replays into free-roam", async () => {
    renderPage();
    let heading = await switchToQuiz();

    for (let i = 0; i < TERMS.length; i += 1) {
      const finished = await playOneRound(heading);
      if (finished) {
        expect(i).toBe(TERMS.length - 1);
      } else {
        heading = await screen.findByRole("heading", { level: 2 });
      }
    }

    // End screen: perfect score, top tier, field guide, cutoff note.
    expect(
      await screen.findByText(`${TERMS.length} / ${TERMS.length} correct`)
    ).toBeInTheDocument();
    expect(screen.getByText(/you are the timeline/i)).toBeInTheDocument();
    expect(screen.getByText(/the field guide/i)).toBeInTheDocument();
    for (const term of TERMS) {
      expect(screen.getByText(`“${term.term}”`)).toBeInTheDocument();
    }
    expect(
      screen.getByText(new RegExp(`through ${KNOWLEDGE_CUTOFF}`, "i"))
    ).toBeInTheDocument();

    // The mode toggle stays available on the end screen.
    expect(
      screen.getByRole("group", { name: /game mode/i })
    ).toBeInTheDocument();

    // Replay drops straight back into a fresh free-roam run.
    fireEvent.click(screen.getByRole("button", { name: /face it again/i }));
    expect(
      await screen.findByRole("button", { name: termButtonName(TERMS[0]) })
    ).toBeEnabled();
    expect(screen.getByText(`0 / ${TERMS.length} answered`)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /free-roam/i, pressed: true })
    ).toBeInTheDocument();
  });
});

// ——— Explore mode (the landing mode) ———

describe("HypeCheck explore mode", () => {
  it("renders every term as a focusable cloud button with explore progress", () => {
    renderPage();
    for (const term of TERMS) {
      const button = screen.getByRole("button", {
        name: termButtonName(term),
      });
      expect(button).toBeEnabled();
      expect(button).not.toHaveAttribute("aria-hidden");
    }
    expect(screen.getByText(`0 / ${TERMS.length} answered`)).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: /overwhelm/i })).toBeInTheDocument();
    // No quiz verdict buttons floating outside a popup.
    expect(
      screen.queryByRole("button", { name: CHOICES[0].label })
    ).not.toBeInTheDocument();
  });

  it("opens a popup, answers it, shows the fact, and dims the word", async () => {
    renderPage();
    const term = TERMS[0];
    fireEvent.click(screen.getByRole("button", { name: termButtonName(term) }));

    const dialog = await screen.findByRole("dialog", {
      name: new RegExp(`verdict on ${term.term}`, "i"),
    });
    expect(dialog).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: CHOICES.find((c) => c.id === term.category).label,
      })
    );

    expect(await screen.findByText(term.fact)).toBeInTheDocument();
    expect(screen.getByText(/correct/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back to the cloud/i }));
    expect(
      await screen.findByText(`1 / ${TERMS.length} answered`)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: termButtonName(term) })).toBeDisabled();
  });

  it("lets the player close a question without penalty", async () => {
    renderPage();
    const term = TERMS[1];
    fireEvent.click(screen.getByRole("button", { name: termButtonName(term) }));
    await screen.findByRole("dialog");

    fireEvent.click(
      screen.getByRole("button", { name: /close without answering/i })
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(`0 / ${TERMS.length} answered`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: termButtonName(term) })).toBeEnabled();
  });

  // 19 popup round-trips through jsdom run long; give it headroom.
  it("plays every term through popups to the end screen, then the toggle starts a fresh quiz", { timeout: 20000 }, async () => {
    renderPage();

    for (let i = 0; i < TERMS.length; i += 1) {
      const term = TERMS[i];
      fireEvent.click(
        screen.getByRole("button", { name: termButtonName(term) })
      );
      await screen.findByRole("dialog");
      fireEvent.click(
        screen.getByRole("button", {
          name: CHOICES.find((c) => c.id === term.category).label,
        })
      );
      const isLast = i === TERMS.length - 1;
      const nextButton = await screen.findByRole("button", {
        name: isLast ? /see the damage/i : /back to the cloud/i,
      });
      fireEvent.click(nextButton);
    }

    expect(
      await screen.findByText(`${TERMS.length} / ${TERMS.length} correct`)
    ).toBeInTheDocument();
    expect(screen.getByText(/you are the timeline/i)).toBeInTheDocument();
    expect(screen.getByText(/the field guide/i)).toBeInTheDocument();

    // Switching modes from the end screen starts a fresh run there.
    fireEvent.click(screen.getByRole("button", { name: /^quiz$/i }));
    expect(
      await screen.findByText(`1 / ${TERMS.length}`)
    ).toBeInTheDocument();
    for (const choice of CHOICES) {
      expect(
        screen.getByRole("button", { name: choice.label })
      ).toBeInTheDocument();
    }
  });
});

// ——— Mode toggle semantics at the page level ———

describe("HypeCheck mode toggle", () => {
  const answerFirstTerm = async () => {
    const term = TERMS[0];
    fireEvent.click(screen.getByRole("button", { name: termButtonName(term) }));
    await screen.findByRole("dialog");
    fireEvent.click(
      screen.getByRole("button", {
        name: CHOICES.find((c) => c.id === term.category).label,
      })
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /back to the cloud/i })
    );
    await screen.findByText(`1 / ${TERMS.length} answered`);
  };

  it("resets the run when hopping between free-roam and quiz", async () => {
    renderPage();
    await answerFirstTerm();

    // Free-roam → quiz: fresh sequential run.
    await switchToQuiz();
    expect(screen.getByText(`1 / ${TERMS.length}`)).toBeInTheDocument();

    // Quiz → free-roam: the earlier explore progress is gone too.
    fireEvent.click(screen.getByRole("button", { name: /free-roam/i }));
    expect(
      await screen.findByText(`0 / ${TERMS.length} answered`)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: termButtonName(TERMS[0]) })
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /free-roam/i, pressed: true })
    ).toBeInTheDocument();
  });

  it("re-picking the active mode changes nothing", async () => {
    renderPage();
    await answerFirstTerm();
    fireEvent.click(
      screen.getByRole("button", { name: /free-roam/i, pressed: true })
    );
    expect(screen.getByText(`1 / ${TERMS.length} answered`)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: termButtonName(TERMS[0]) })
    ).toBeDisabled();
  });
});
