import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuestionCard } from "@/components/audit/QuestionCard";
import { QUESTIONS } from "@/data/questionBank";

const choice = QUESTIONS.find((question) => question.id === "web-presence")!;
const scale = QUESTIONS.find((question) => question.id === "web-speed")!;

describe("QuestionCard — CHOICE", () => {
  it("renders the question, its help text and every option as a radio", () => {
    render(
      <QuestionCard question={choice} entry={undefined} onAnswer={vi.fn()} invalid={false} />
    );

    expect(screen.getByRole("heading", { name: choice.text })).toBeInTheDocument();
    expect(screen.getByText(choice.help!)).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(choice.options.length);
  });

  it("reports the selected option", async () => {
    const onAnswer = vi.fn();
    render(
      <QuestionCard question={choice} entry={undefined} onAnswer={onAnswer} invalid={false} />
    );

    await userEvent.click(screen.getByRole("radio", { name: /No website at all/ }));
    expect(onAnswer).toHaveBeenCalledWith({ optionId: "web-presence-none" });
  });

  it("marks only the stored answer as checked", () => {
    render(
      <QuestionCard
        question={choice}
        entry={{ optionId: "web-presence-dated" }}
        onAnswer={vi.fn()}
        invalid={false}
      />
    );

    const checked = screen.getAllByRole("radio").filter(
      (radio) => radio.getAttribute("aria-checked") === "true"
    );
    expect(checked).toHaveLength(1);
    expect(checked[0]).toHaveAccessibleName(/dated and rarely touched/);
  });

  it("shows no selection when the question was skipped", () => {
    render(
      <QuestionCard
        question={choice}
        entry={{ optionId: "web-presence-dated", skipped: true }}
        onAnswer={vi.fn()}
        invalid={false}
      />
    );

    expect(
      screen.getAllByRole("radio").every((radio) => radio.getAttribute("aria-checked") === "false")
    ).toBe(true);
    expect(screen.getByText(/Skipped/)).toBeInTheDocument();
  });

  it("surfaces the validation message only when invalid", () => {
    const { rerender } = render(
      <QuestionCard question={choice} entry={undefined} onAnswer={vi.fn()} invalid={false} />
    );
    expect(screen.queryByText(/Choose an answer/)).not.toBeInTheDocument();

    rerender(
      <QuestionCard question={choice} entry={undefined} onAnswer={vi.fn()} invalid />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/Choose an answer, or use Skip/);
  });
});

describe("QuestionCard — SCALE", () => {
  it("renders one radio per step, with both ends labelled", () => {
    render(
      <QuestionCard question={scale} entry={undefined} onAnswer={vi.fn()} invalid={false} />
    );

    expect(screen.getAllByRole("radio")).toHaveLength(10);
    expect(screen.getByText(scale.scaleLowLabel!)).toBeInTheDocument();
    expect(screen.getByText(scale.scaleHighLabel!)).toBeInTheDocument();
  });

  it("reports the selected value as a number", async () => {
    const onAnswer = vi.fn();
    render(
      <QuestionCard question={scale} entry={undefined} onAnswer={onAnswer} invalid={false} />
    );

    await userEvent.click(screen.getByRole("radio", { name: "7 out of 10" }));
    expect(onAnswer).toHaveBeenCalledWith({ value: 7 });
  });

  it("marks the stored value as checked", () => {
    render(
      <QuestionCard question={scale} entry={{ value: 4 }} onAnswer={vi.fn()} invalid={false} />
    );
    expect(screen.getByRole("radio", { name: "4 out of 10" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });
});
