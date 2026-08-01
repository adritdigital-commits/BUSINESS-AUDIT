import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameBoard } from "@/components/game/GameBoard";
import { CARD_COUNT } from "@/lib/game/deck";
import { BEST_KEY } from "@/lib/game/storage";

/**
 * The board is the only stateful part of the game, so these cover the wiring
 * rather than the rules: what a click does, what the keyboard does, and what
 * survives a reload. The rules themselves are covered in src/lib/game.
 *
 * jsdom has no Web Audio, so `play()` bails out on its own — that path is
 * exercised here rather than mocked.
 */

const cards = () => screen.getAllByTestId("memory-card");

/** The symbol on a card, read the way the accessible name exposes it. */
function symbolOf(card: HTMLElement): string {
  const label = card.getAttribute("aria-label") ?? "";
  return label.replace(/^Card \d+, (?:showing|matched: )/, "");
}

/** Waits out the pause a mismatched pair is held for; a click during it is ignored. */
async function settle() {
  await waitFor(
    () => expect(cards().filter((card) => card.dataset.state === "flipped").length).toBeLessThan(2),
    { timeout: 3000 }
  );
}

/**
 * Turns every card over once to learn the board, waiting out each mismatch, and
 * returns the cards grouped by the symbol they showed. This is how a test gets
 * a known pair out of a deck it did not choose the order of.
 */
async function learnBoard(user: ReturnType<typeof userEvent.setup>) {
  const known = new Map<string, HTMLElement[]>();
  for (const card of cards()) {
    await user.click(card);
    // Read the face before the pause ends and it turns back over.
    known.set(symbolOf(card), [...(known.get(symbolOf(card)) ?? []), card]);
    await settle();
  }
  return known;
}

/**
 * Two still-unmatched cards showing different symbols. Pairs turned up by luck
 * during the reveal pass are already matched and cannot be played again.
 */
async function findMismatch(user: ReturnType<typeof userEvent.setup>) {
  const known = await learnBoard(user);
  const playable = Array.from(known.entries()).filter(([, group]) =>
    group.every((card) => card.dataset.state === "down")
  );
  expect(playable.length, "two unmatched symbols must remain").toBeGreaterThan(1);
  return [playable[0][1][0], playable[1][1][0]] as const;
}

describe("GameBoard", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("deals 24 cards, all face down", async () => {
    render(<GameBoard />);
    await waitFor(() => expect(cards()).toHaveLength(CARD_COUNT));
    expect(cards().every((card) => card.dataset.state === "down")).toBe(true);
  });

  it("turns a card over on click", async () => {
    const user = userEvent.setup();
    render(<GameBoard />);
    await waitFor(() => expect(cards()).toHaveLength(CARD_COUNT));

    await user.click(cards()[0]);
    expect(cards()[0].dataset.state).toBe("flipped");
    expect(cards()[0]).toHaveAttribute("aria-pressed", "true");
  });

  it("counts a move only when a second card is turned", async () => {
    const user = userEvent.setup();
    render(<GameBoard />);
    await waitFor(() => expect(cards()).toHaveLength(CARD_COUNT));
    const moves = () => within(screen.getByLabelText("Score")).getByText("Moves").nextSibling;

    await user.click(cards()[0]);
    expect(moves()).toHaveTextContent("0");

    await user.click(cards()[1]);
    expect(moves()).toHaveTextContent("1");
  });

  it("keeps a matched pair face up", async () => {
    const user = userEvent.setup();
    render(<GameBoard />);
    await waitFor(() => expect(cards()).toHaveLength(CARD_COUNT));

    const known = await learnBoard(user);
    const pair = Array.from(known.values()).find((group) => group.length === 2);
    expect(pair, "the deck must contain a pair").toBeTruthy();

    await user.click(pair![0]);
    await user.click(pair![1]);

    expect(pair![0].dataset.state).toBe("matched");
    expect(pair![1].dataset.state).toBe("matched");
    expect(pair![0]).toBeDisabled();
  }, 60_000);

  it("turns a mismatched pair back over, and ignores a third card until it does", async () => {
    const user = userEvent.setup();
    render(<GameBoard />);
    await waitFor(() => expect(cards()).toHaveLength(CARD_COUNT));

    const [a, b] = await findMismatch(user);
    await user.click(a);
    await user.click(b);

    expect(a.dataset.state).toBe("flipped");
    expect(b.dataset.state).toBe("flipped");

    // The board is locked: a third card does nothing.
    const third = cards().find(
      (card) => card !== a && card !== b && card.dataset.state === "down"
    )!;
    await user.click(third);
    expect(third.dataset.state).toBe("down");

    await settle();
    expect(a.dataset.state).toBe("down");
    expect(b.dataset.state).toBe("down");
  }, 60_000);

  it("turns a card with the keyboard and moves focus with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<GameBoard />);
    await waitFor(() => expect(cards()).toHaveLength(CARD_COUNT));

    cards()[0].focus();
    await user.keyboard("{Enter}");
    expect(cards()[0].dataset.state).toBe("flipped");

    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(cards()[1]);

    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(cards()[0]);

    await user.keyboard("{End}");
    expect(document.activeElement).toBe(cards()[CARD_COUNT - 1]);

    // The edges hold: nothing is focused off the end of the board.
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(cards()[CARD_COUNT - 1]);
  });

  it("restarts on the Restart button and on R", async () => {
    const user = userEvent.setup();
    render(<GameBoard />);
    await waitFor(() => expect(cards()).toHaveLength(CARD_COUNT));

    await user.click(cards()[0]);
    await user.click(screen.getByRole("button", { name: "Restart" }));
    expect(cards().every((card) => card.dataset.state === "down")).toBe(true);

    await user.click(cards()[0]);
    expect(cards()[0].dataset.state).toBe("flipped");
    await user.keyboard("r");
    await waitFor(() => expect(cards()[0].dataset.state).toBe("down"));
  });

  it("shows no personal best until one is stored", async () => {
    render(<GameBoard />);
    await waitFor(() => expect(cards()).toHaveLength(CARD_COUNT));
    const board = screen.getByLabelText("Score");
    expect(within(board).getByText("Win a game to set one")).toBeInTheDocument();
  });

  it("reads a previously stored best score", async () => {
    window.localStorage.setItem(
      BEST_KEY,
      JSON.stringify({ moves: 17, seconds: 74, achievedAt: "2026-08-01T00:00:00.000Z" })
    );
    render(<GameBoard />);

    const board = screen.getByLabelText("Score");
    await waitFor(() => expect(within(board).getByText("17")).toBeInTheDocument());
    expect(within(board).getByText("moves, in 1:14")).toBeInTheDocument();
  });

  it("survives storage being unavailable", async () => {
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("denied");
      });

    render(<GameBoard />);
    await waitFor(() => expect(cards()).toHaveLength(CARD_COUNT));
    expect(screen.getByLabelText("Score")).toBeInTheDocument();

    getItem.mockRestore();
  });

  it("toggles sound and remembers the choice", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<GameBoard />);
    await waitFor(() => expect(cards()).toHaveLength(CARD_COUNT));

    await user.click(screen.getByRole("button", { name: /Sound on/ }));
    expect(screen.getByRole("button", { name: /Sound off/ })).toBeInTheDocument();

    unmount();
    render(<GameBoard />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Sound off/ })).toBeInTheDocument()
    );
  });

  it("names every card for a screen reader without giving the answer away", async () => {
    render(<GameBoard />);
    await waitFor(() => expect(cards()).toHaveLength(CARD_COUNT));

    for (const card of cards()) {
      expect(card.getAttribute("aria-label")).toMatch(/^Card \d+, face down/);
    }
  });

  it("announces progress in a live region", async () => {
    render(<GameBoard />);
    await waitFor(() => expect(cards()).toHaveLength(CARD_COUNT));
    expect(screen.getByText("0 of 12 pairs found in 0 moves.")).toBeInTheDocument();
  });

  it("has no victory dialog before the game is won", async () => {
    render(<GameBoard />);
    await waitFor(() => expect(cards()).toHaveLength(CARD_COUNT));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("celebrates a completed board, records the best score and plays again", async () => {
    const user = userEvent.setup();
    render(<GameBoard />);
    await waitFor(() => expect(cards()).toHaveLength(CARD_COUNT));

    // Learn the whole board, then clear it. Cards matched by luck during the
    // reveal pass are already gone; clicking them again is a no-op.
    const known = await learnBoard(user);
    for (const pair of Array.from(known.values())) {
      if (pair.length !== 2) continue;
      await user.click(pair[0]);
      await user.click(pair[1]);
    }

    const dialog = await screen.findByRole("dialog", {}, { timeout: 5000 });
    expect(within(dialog).getByText("All twelve pairs found")).toBeInTheDocument();
    expect(cards().every((card) => card.dataset.state === "matched")).toBe(true);

    // The reveal pass burned moves of its own, so the score is not 12 — what
    // matters is that a completed board is recorded at all.
    const stored = JSON.parse(window.localStorage.getItem(BEST_KEY)!);
    expect(stored.moves).toBeGreaterThanOrEqual(12);
    expect(Number.isFinite(stored.seconds)).toBe(true);

    await user.click(within(dialog).getByRole("button", { name: "Play again" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(cards().every((card) => card.dataset.state === "down")).toBe(true);
  }, 60_000);
});
