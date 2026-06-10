import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AlertToast from "../AlertToast";
import { EVENTS } from "../constants";

const saleAlert = {
  id: "alert-1",
  eventId: "sale-vienna-grief",
  event: EVENTS["sale-vienna-grief"],
};

const warningAlert = {
  id: "alert-2",
  eventId: "happiness-contam",
  event: EVENTS["happiness-contam"],
};

describe("AlertToast", () => {
  it("renders sale alerts with the computed amount", () => {
    render(
      <AlertToast alerts={[saleAlert]} onDismiss={vi.fn()} reducedMotion />
    );
    expect(
      screen.getByText(EVENTS["sale-vienna-grief"].message)
    ).toBeInTheDocument();
    expect(screen.getByText("+$1.20")).toBeInTheDocument();
  });

  it("marks critical warnings", () => {
    render(
      <AlertToast alerts={[warningAlert]} onDismiss={vi.fn()} reducedMotion />
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-kind", "warning");
    expect(button).toHaveAttribute("data-severity", "critical");
  });

  it("dismisses on click", () => {
    const onDismiss = vi.fn();
    render(
      <AlertToast alerts={[saleAlert]} onDismiss={onDismiss} reducedMotion />
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onDismiss).toHaveBeenCalledWith("alert-1");
  });
});
