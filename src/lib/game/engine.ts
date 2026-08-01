import { CARD_COUNT, orderedDeck, type Card } from "@/lib/game/deck";

/**
 * The rules of the game, as pure functions.
 *
 * No timers, no DOM, no React. The component decides *when* a mismatch is
 * cleared; this file decides what a flip means. That split is what makes the
 * rules testable without rendering anything.
 */

export type GameStatus = "idle" | "playing" | "resolving" | "won";

export interface GameState {
  deck: Card[];
  /** Face-up and not yet resolved. Never more than two. */
  flipped: string[];
  matched: string[];
  moves: number;
  status: GameStatus;
  /** Epoch ms of the first flip, so the clock starts when the player does. */
  startedAt: number | null;
  finishedAt: number | null;
  /** Bumped whenever a mismatch needs clearing, so the effect can key off it. */
  resolveToken: number;
}

export interface GameResult {
  moves: number;
  seconds: number;
}

export function initialState(deck: Card[] = orderedDeck()): GameState {
  return {
    deck,
    flipped: [],
    matched: [],
    moves: 0,
    status: "idle",
    startedAt: null,
    finishedAt: null,
    resolveToken: 0,
  };
}

/** What the last flip did — the component uses this to pick a sound. */
export type FlipOutcome = "ignored" | "revealed" | "matched" | "missed" | "won";

export interface FlipResult {
  state: GameState;
  outcome: FlipOutcome;
}

export function flip(state: GameState, cardId: string, at: number): FlipResult {
  const card = state.deck.find((entry) => entry.id === cardId);

  const unplayable =
    !card ||
    state.status === "won" ||
    state.status === "resolving" ||
    state.flipped.includes(cardId) ||
    state.matched.includes(cardId);

  if (unplayable) return { state, outcome: "ignored" };

  // First of a pair: just turn it over. No move is counted until a guess is
  // actually made, which is what a player means by "moves".
  if (state.flipped.length === 0) {
    return {
      state: {
        ...state,
        flipped: [cardId],
        status: "playing",
        startedAt: state.startedAt ?? at,
      },
      outcome: "revealed",
    };
  }

  const firstId = state.flipped[0];
  const first = state.deck.find((entry) => entry.id === firstId);
  const isMatch = Boolean(first && card && first.symbolId === card.symbolId);
  const moves = state.moves + 1;

  if (!isMatch) {
    return {
      state: {
        ...state,
        flipped: [firstId, cardId],
        moves,
        status: "resolving",
        resolveToken: state.resolveToken + 1,
      },
      outcome: "missed",
    };
  }

  const matched = [...state.matched, firstId, cardId];
  const won = matched.length === CARD_COUNT;

  return {
    state: {
      ...state,
      flipped: [],
      matched,
      moves,
      status: won ? "won" : "playing",
      finishedAt: won ? at : null,
    },
    outcome: won ? "won" : "matched",
  };
}

/** Turns the two mismatched cards back over. */
export function resolve(state: GameState): GameState {
  if (state.status !== "resolving") return state;
  return { ...state, flipped: [], status: "playing" };
}

export function restart(deck: Card[]): GameState {
  return initialState(deck);
}

export function elapsedMs(state: GameState, now: number): number {
  if (state.startedAt === null) return 0;
  return Math.max(0, (state.finishedAt ?? now) - state.startedAt);
}

export function resultOf(state: GameState): GameResult | null {
  if (state.status !== "won" || state.startedAt === null || state.finishedAt === null) {
    return null;
  }
  return {
    moves: state.moves,
    seconds: Math.round((state.finishedAt - state.startedAt) / 1000),
  };
}

/**
 * The lowest possible move count is one guess per pair; anything at or near it
 * is a near-perfect game. Used for the accuracy figure on the scoreboard.
 */
export function accuracy(state: GameState): number {
  if (state.moves === 0) return 0;
  return Math.round((state.matched.length / 2 / state.moves) * 100);
}

export function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
