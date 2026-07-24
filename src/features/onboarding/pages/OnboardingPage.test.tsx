import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach } from "vitest";
import { OnboardingPage } from "./OnboardingPage";

describe("onboarding", () => {
  beforeEach(() => {
    localStorage.setItem("lunapair-splash", "seen");
  });

  it("selects role and opens tracker onboarding", async () => {
    render(<OnboardingPage />);
    await userEvent.click(screen.getByRole("radio", { name: /я девушка/i }));
    await userEvent.click(screen.getByRole("button", { name: /продолжить/i }));
    expect(screen.getByText(/как к тебе обращаться/i)).toBeInTheDocument();
  });

  it("switches to partner onboarding", async () => {
    render(<OnboardingPage />);
    await userEvent.click(screen.getByRole("radio", { name: /я парень/i }));
    await userEvent.click(screen.getByRole("button", { name: /продолжить/i }));
    expect(screen.getByText(/режим партнёра/i)).toBeInTheDocument();
  });

  it("does not allow tracker onboarding to continue without a name", async () => {
    render(<OnboardingPage />);
    await userEvent.click(screen.getByRole("radio", { name: /я девушка/i }));
    await userEvent.click(screen.getByRole("button", { name: /продолжить/i }));

    const nextButton = screen.getByRole("button", { name: /дальше/i });
    expect(nextButton).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/имя/i), "Анна");
    expect(nextButton).toBeEnabled();
  });
});
