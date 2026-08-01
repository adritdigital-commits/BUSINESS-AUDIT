import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuestionCard } from "@/components/audit/QuestionCard";
import { getQuestion } from "@/data/questionBanks";
import type { PlannedQuestion } from "@/engine/questionEngine";

const question = getQuestion("web-dependency")!;

function planned(overrides: Partial<PlannedQuestion> = {}): PlannedQuestion {
  return {
    question,
    sectionName: "Website & Digital Presence",
    reason: null,
    isFollowUp: false,
    ...overrides,
  };
}

describe("QuestionCard", () => {
  it("renders the question, its description and every option as a radio", () => {
    render(
      <QuestionCard item={planned()} entry={undefined} onAnswer={vi.fn()} invalid={false} />
    );

    expect(screen.getByRole("heading", { name: question.title })).toBeInTheDocument();
    expect(screen.getByText(question.description!)).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(question.options.length);
  });

  it("reports the selected option", async () => {
    const onAnswer = vi.fn();
    render(
      <QuestionCard item={planned()} entry={undefined} onAnswer={onAnswer} invalid={false} />
    );

    await userEvent.click(screen.getByRole("radio", { name: /brochure nobody uses/ }));
    expect(onAnswer).toHaveBeenCalledWith({ optionId: "web-dependency-none" });
  });

  it("marks only the stored answer as checked", () => {
    render(
      <QuestionCard
        item={planned()}
        entry={{ optionId: "web-dependency-half" }}
        onAnswer={vi.fn()}
        invalid={false}
      />
    );

    const checked = screen
      .getAllByRole("radio")
      .filter((radio) => radio.getAttribute("aria-checked") === "true");
    expect(checked).toHaveLength(1);
    expect(checked[0]).toHaveAccessibleName(/25–50%/);
  });

  it("shows no selection when the question was skipped", () => {
    render(
      <QuestionCard
        item={planned()}
        entry={{ optionId: "web-dependency-half", skipped: true }}
        onAnswer={vi.fn()}
        invalid={false}
      />
    );

    expect(
      screen.getAllByRole("radio").every((r) => r.getAttribute("aria-checked") === "false")
    ).toBe(true);
    expect(screen.getByText(/Skipped/)).toBeInTheDocument();
  });

  it("surfaces the validation message only when invalid", () => {
    const { rerender } = render(
      <QuestionCard item={planned()} entry={undefined} onAnswer={vi.fn()} invalid={false} />
    );
    expect(screen.queryByText(/Choose an answer/)).not.toBeInTheDocument();

    rerender(<QuestionCard item={planned()} entry={undefined} onAnswer={vi.fn()} invalid />);
    expect(screen.getByRole("alert")).toHaveTextContent(/Choose an answer, or use Skip/);
  });

  it("explains why an adaptive question is being asked", () => {
    render(
      <QuestionCard
        item={planned({ reason: "Specific to healthcare & wellness" })}
        entry={undefined}
        onAnswer={vi.fn()}
        invalid={false}
      />
    );
    expect(screen.getByText("Specific to healthcare & wellness")).toBeInTheDocument();
  });

  it("marks a follow-up as unlocked by a previous answer", () => {
    render(
      <QuestionCard
        item={planned({ reason: "Asked because of your previous answer", isFollowUp: true })}
        entry={undefined}
        onAnswer={vi.fn()}
        invalid={false}
      />
    );
    expect(screen.getByText("Asked because of your previous answer")).toBeInTheDocument();
  });
});
