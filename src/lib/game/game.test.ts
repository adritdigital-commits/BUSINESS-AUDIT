import { describe, expect, it } from "vitest";
import { CARD_COUNT, PAIR_COUNT, SYMBOLS, orderedDeck, shuffle } from "@/lib/game/deck";
import {
  accuracy,
  elapsedMs,
  flip,
  formatClock,
  initialState,
  resolve,
  restart,
  resultOf,
  type GameState,
} from "@/lib/game/engine";
import { isBetter, parseBest } from "@/lib/game/storage";

/** Plays a perfect game: every guess is a match. */
function playPerfectly(from: GameState = initialState()): GameState {
  let state = from;
  let clock = 1000;
  for (const symbol of SYMBOLS) {
    state = flip(state, `${symbol.id}-a`, (clock += 1000)).state;
    state = flip(state, `${symbol.id}-b`, (clock += 1000)).state;
  }
  return state;
}

describe("the deck", () => {
  it("deals 24 cards as 12 pairs", () => {
    const deck = orderedDeck();
    expect(deck).toHaveLength(CARD_COUNT);
    expect(CARD_COUNT).toBe(24);
    expect(PAIR_COUNT).toBe(12);

    const bySymbol = new Map<string, number>();
    for (const card of deck) {
      bySymbol.set(card.symbolId, (bySymbol.get(card.symbolId) ?? 0) + 1);
    }
    expect(bySymbol.size).toBe(12);
    expect(Array.from(bySymbol.values()).every((count) => count === 2)).toBe(true);
  });

  it("gives every card a unique id", () => {
    const ids = orderedDeck().map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("distinguishes symbols by shape, not only by colour", () => {
    // Every symbol carries its own label; a duplicate would mean two faces are
    // separable by tint alone, which is not a game everyone can play.
    const labels = SYMBOLS.map((symbol) => symbol.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("shuffles without losing or duplicating a card", () => {
    let seed = 7;
    const random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const deck = orderedDeck();
    const shuffled = shuffle(deck, random);

    expect(shuffled).toHaveLength(deck.length);
    expect(new Set(shuffled.map((card) => card.id))).toEqual(
      new Set(deck.map((card) => card.id))
    );
    expect(shuffled.map((card) => card.id)).not.toEqual(deck.map((card) => card.id));
    expect(deck.map((card) => card.id)).toEqual(orderedDeck().map((card) => card.id));
  });
});

describe("flipping", () => {
  it("turns the first card over without counting a move", () => {
    const state = flip(initialState(), "crown-a", 1000);
    expect(state.outcome).toBe("revealed");
    expect(state.state.flipped).toEqual(["crown-a"]);
    expect(state.state.moves).toBe(0);
    expect(state.state.status).toBe("playing");
  });

  it("starts the clock on the first flip and never restarts it", () => {
    let state = flip(initialState(), "crown-a", 5000).state;
    expect(state.startedAt).toBe(5000);
    state = flip(state, "key-a", 9000).state;
    expect(state.startedAt).toBe(5000);
  });

  it("counts a move on the second card, not the first", () => {
    let state = flip(initialState(), "crown-a", 1000).state;
    state = flip(state, "key-a", 2000).state;
    expect(state.moves).toBe(1);
  });

  it("keeps a matched pair face up and clears the guess", () => {
    let state = flip(initialState(), "crown-a", 1000).state;
    const second = flip(state, "crown-b", 2000);
    state = second.state;

    expect(second.outcome).toBe("matched");
    expect(state.matched).toEqual(["crown-a", "crown-b"]);
    expect(state.flipped).toEqual([]);
    expect(state.status).toBe("playing");
  });

  it("holds a mismatched pair face up until it is resolved", () => {
    let state = flip(initialState(), "crown-a", 1000).state;
    const second = flip(state, "key-a", 2000);
    state = second.state;

    expect(second.outcome).toBe("missed");
    expect(state.flipped).toEqual(["crown-a", "key-a"]);
    expect(state.status).toBe("resolving");

    state = resolve(state);
    expect(state.flipped).toEqual([]);
    expect(state.status).toBe("playing");
    expect(state.matched).toEqual([]);
  });

  it("ignores a third card while a mismatch is on screen", () => {
    let state = flip(initialState(), "crown-a", 1000).state;
    state = flip(state, "key-a", 2000).state;

    const third = flip(state, "moon-a", 3000);
    expect(third.outcome).toBe("ignored");
    expect(third.state).toBe(state);
  });

  it("ignores the same card being clicked twice", () => {
    const state = flip(initialState(), "crown-a", 1000).state;
    const again = flip(state, "crown-a", 1500);
    expect(again.outcome).toBe("ignored");
    expect(again.state.moves).toBe(0);
  });

  it("ignores a card that has already been matched", () => {
    let state = flip(initialState(), "crown-a", 1000).state;
    state = flip(state, "crown-b", 2000).state;

    const again = flip(state, "crown-a", 3000);
    expect(again.outcome).toBe("ignored");
  });

  it("ignores an id that is not in the deck", () => {
    expect(flip(initialState(), "not-a-card", 1000).outcome).toBe("ignored");
  });

  it("bumps the resolve token so repeated misses each get their own timer", () => {
    let state = flip(initialState(), "crown-a", 1000).state;
    state = flip(state, "key-a", 2000).state;
    const first = state.resolveToken;

    state = resolve(state);
    state = flip(state, "moon-a", 3000).state;
    state = flip(state, "star-a", 4000).state;

    expect(state.resolveToken).toBe(first + 1);
  });

  it("leaves a non-resolving state alone", () => {
    const state = initialState();
    expect(resolve(state)).toBe(state);
  });
});

describe("winning", () => {
  it("is won only when all 24 cards are matched", () => {
    const state = playPerfectly();
    expect(state.matched).toHaveLength(CARD_COUNT);
    expect(state.status).toBe("won");
    expect(state.moves).toBe(PAIR_COUNT);
  });

  it("reports the outcome of the last flip as the win", () => {
    let state = playPerfectly();
    state = restart(orderedDeck());
    let clock = 0;
    let last = flip(state, "diamond-a", (clock += 1000));

    for (const symbol of SYMBOLS) {
      last = flip(last.state, `${symbol.id}-a`, (clock += 1000));
      last = flip(last.state, `${symbol.id}-b`, (clock += 1000));
    }
    expect(last.outcome).toBe("won");
  });

  it("stops the clock at the winning flip", () => {
    const state = playPerfectly();
    expect(state.finishedAt).not.toBeNull();
    expect(elapsedMs(state, 9_999_999)).toBe(state.finishedAt! - state.startedAt!);
  });

  it("summarises the result in moves and whole seconds", () => {
    const state = playPerfectly();
    const result = resultOf(state);
    expect(result).toEqual({ moves: 12, seconds: 23 });
  });

  it("has no result before the game is won", () => {
    expect(resultOf(initialState())).toBeNull();
    expect(resultOf(flip(initialState(), "crown-a", 1000).state)).toBeNull();
  });

  it("restarts to a clean state on a new deck", () => {
    const deck = shuffle(orderedDeck());
    const state = restart(deck);
    expect(state.deck).toBe(deck);
    expect(state.moves).toBe(0);
    expect(state.matched).toEqual([]);
    expect(state.startedAt).toBeNull();
    expect(state.status).toBe("idle");
  });
});

describe("derived figures", () => {
  it("reports no elapsed time before the first flip", () => {
    expect(elapsedMs(initialState(), 500_000)).toBe(0);
  });

  it("counts accuracy as pairs found per guess made", () => {
    let state = flip(initialState(), "crown-a", 1000).state;
    state = flip(state, "crown-b", 2000).state;
    expect(accuracy(state)).toBe(100);

    state = flip(state, "key-a", 3000).state;
    state = flip(state, "moon-a", 4000).state;
    expect(accuracy(state)).toBe(50);
  });

  it("reports zero accuracy before any guess", () => {
    expect(accuracy(initialState())).toBe(0);
  });

  it("formats the clock as minutes and padded seconds", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(9_000)).toBe("0:09");
    expect(formatClock(63_000)).toBe("1:03");
    expect(formatClock(600_000)).toBe("10:00");
  });
});

describe("the best score", () => {
  it("takes any result when there is no previous best", () => {
    expect(isBetter({ moves: 30, seconds: 200 }, null)).toBe(true);
  });

  it("prefers fewer moves, whatever the clock says", () => {
    const best = { moves: 20, seconds: 40, achievedAt: "" };
    expect(isBetter({ moves: 19, seconds: 300 }, best)).toBe(true);
    expect(isBetter({ moves: 21, seconds: 1 }, best)).toBe(false);
  });

  it("breaks a tie on moves with the faster time", () => {
    const best = { moves: 20, seconds: 40, achievedAt: "" };
    expect(isBetter({ moves: 20, seconds: 39 }, best)).toBe(true);
    expect(isBetter({ moves: 20, seconds: 40 }, best)).toBe(false);
  });

  it("reads back a stored score", () => {
    const stored = JSON.stringify({ moves: 14, seconds: 61, achievedAt: "2026-08-01" });
    expect(parseBest(stored)).toEqual({ moves: 14, seconds: 61, achievedAt: "2026-08-01" });
  });

  it("rejects anything it cannot trust", () => {
    expect(parseBest(null)).toBeNull();
    expect(parseBest("")).toBeNull();
    expect(parseBest("not json")).toBeNull();
    expect(parseBest("[]")).toBeNull();
    expect(parseBest('"a string"')).toBeNull();
    expect(parseBest(JSON.stringify({ moves: "12", seconds: 30 }))).toBeNull();
    expect(parseBest(JSON.stringify({ moves: 0, seconds: 30 }))).toBeNull();
    expect(parseBest(JSON.stringify({ moves: 12, seconds: -1 }))).toBeNull();
    expect(parseBest(JSON.stringify({ moves: Infinity, seconds: 3 }))).toBeNull();
    expect(parseBest(JSON.stringify({ moves: 12 }))).toBeNull();
  });

  it("tolerates a score written without a timestamp", () => {
    expect(parseBest(JSON.stringify({ moves: 12, seconds: 30 }))).toEqual({
      moves: 12,
      seconds: 30,
      achievedAt: "",
    });
  });
});
