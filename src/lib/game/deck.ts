/**
 * The deck: 12 symbols, dealt as 24 cards.
 *
 * Every symbol is distinguished by its *shape*, not its colour — the colour is
 * decoration. A player who cannot separate gold from rose still plays the game
 * exactly as well, which is the only accessible way to build a matching game.
 */

export interface Symbol {
  id: string;
  /** Announced to screen readers and used in the win summary. */
  label: string;
  /** Decorative tint. Never the only thing telling two symbols apart. */
  tint: string;
}

export interface Card {
  /** Unique per card. The two cards of a pair share `symbolId`, not `id`. */
  id: string;
  symbolId: string;
}

export const SYMBOLS: readonly Symbol[] = [
  { id: "diamond", label: "Diamond", tint: "#e5b33a" },
  { id: "crown", label: "Crown", tint: "#f0c975" },
  { id: "key", label: "Key", tint: "#d9a441" },
  { id: "anchor", label: "Anchor", tint: "#7fb3d5" },
  { id: "feather", label: "Feather", tint: "#9ec9c4" },
  { id: "moon", label: "Crescent", tint: "#c3c8d6" },
  { id: "compass", label: "Compass", tint: "#8fa6e0" },
  { id: "hourglass", label: "Hourglass", tint: "#e0a17c" },
  { id: "leaf", label: "Leaf", tint: "#8fc79a" },
  { id: "bolt", label: "Bolt", tint: "#f2d06b" },
  { id: "star", label: "Star", tint: "#dcd3f0" },
  { id: "orbit", label: "Orbit", tint: "#a8c4d8" },
] as const;

export const PAIR_COUNT = SYMBOLS.length;
export const CARD_COUNT = PAIR_COUNT * 2;

/**
 * The deck in canonical order.
 *
 * The server renders this, and the client shuffles on mount. Both are correct
 * because every card starts face down — the order is not observable, so there
 * is nothing to mismatch during hydration.
 */
export function orderedDeck(): Card[] {
  return SYMBOLS.flatMap((symbol) => [
    { id: `${symbol.id}-a`, symbolId: symbol.id },
    { id: `${symbol.id}-b`, symbolId: symbol.id },
  ]);
}

/** Fisher–Yates. `random` is injectable so the shuffle can be tested. */
export function shuffle(cards: readonly Card[], random: () => number = Math.random): Card[] {
  const result = [...cards];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

const SYMBOL_BY_ID = new Map(SYMBOLS.map((symbol) => [symbol.id, symbol]));

export function symbolFor(symbolId: string): Symbol {
  return SYMBOL_BY_ID.get(symbolId) ?? SYMBOLS[0];
}
