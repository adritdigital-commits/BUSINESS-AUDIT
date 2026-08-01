"use client";

import { useCallback, useEffect, useRef } from "react";
import { GameHeader } from "@/components/game/GameHeader";
import { MemoryCard } from "@/components/game/MemoryCard";
import { ScoreBoard } from "@/components/game/ScoreBoard";
import { VictoryModal } from "@/components/game/VictoryModal";
import { PAIR_COUNT } from "@/lib/game/deck";
import { useMemoryGame } from "@/lib/game/useMemoryGame";

/**
 * The board, and the only stateful piece of the game.
 *
 * All the rules live in `src/lib/game`; this component decides when a
 * mismatched pair is cleared, how the grid is navigated, and what is on
 * screen. Nothing here talks to a network, a database or a server action —
 * the page is static HTML plus this bundle.
 */
export function GameBoard() {
  const game = useMemoryGame();
  const gridRef = useRef<HTMLDivElement>(null);

  const { restart } = game;

  // ------------------------------------------------------------- shortcuts
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        restart();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [restart]);

  /**
   * Arrow keys move focus around the grid. The column count is read from the
   * grid's own computed style rather than hard-coded, so it stays correct at
   * every breakpoint without duplicating the responsive rules in JavaScript.
   */
  const onCardKeyDown = useCallback(
    (index: number) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
      const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
      if (!keys.includes(event.key)) return;

      const grid = gridRef.current;
      if (!grid) return;
      const cards = Array.from(
        grid.querySelectorAll<HTMLButtonElement>('[data-testid="memory-card"]')
      );
      if (cards.length === 0) return;

      const columns = window
        .getComputedStyle(grid)
        .gridTemplateColumns.split(" ")
        .filter(Boolean).length;

      let next = index;
      if (event.key === "ArrowLeft") next = index - 1;
      if (event.key === "ArrowRight") next = index + 1;
      if (event.key === "ArrowUp") next = index - columns;
      if (event.key === "ArrowDown") next = index + columns;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = cards.length - 1;

      if (next < 0 || next >= cards.length) return;
      event.preventDefault();
      cards[next].focus();
    },
    []
  );

  const isNewBest =
    game.result !== null &&
    game.best !== null &&
    game.best.moves === game.result.moves &&
    game.best.seconds === game.result.seconds;

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 h-96 aurora" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-7 px-5 py-10 sm:px-8 sm:py-14">
        <GameHeader
          pairsFound={game.pairsFound}
          pairTotal={PAIR_COUNT}
          soundOn={game.soundOn}
          onRestart={game.restart}
          onToggleSound={game.toggleSound}
        />

        <ScoreBoard
          elapsed={game.elapsed}
          moves={game.state.moves}
          pairsFound={game.pairsFound}
          pairTotal={PAIR_COUNT}
          accuracy={game.accuracy}
          best={game.best}
          running={game.state.startedAt !== null && game.state.status !== "won"}
        />

        <div
          ref={gridRef}
          role="group"
          aria-label="Memory board, 24 cards"
          className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 sm:gap-3.5"
        >
          {game.state.deck.map((card, index) => (
            <MemoryCard
              key={card.id}
              symbolId={card.symbolId}
              index={index}
              flipped={game.ready && game.view.isFlipped(card.id)}
              matched={game.view.isMatched(card.id)}
              missed={game.view.isMissed(card.id)}
              disabled={!game.ready || game.view.isMatched(card.id) || game.view.locked}
              onFlip={() => game.flipCard(card.id)}
              onKeyDown={onCardKeyDown(index)}
            />
          ))}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[12.5px] text-ink-muted">
          <p>
            Tab or the arrow keys to move · Enter or Space to turn a card ·{" "}
            <kbd className="rounded border border-hairline-strong px-1.5 py-0.5 font-mono text-[11px]">
              R
            </kbd>{" "}
            to restart
          </p>
          <p>Your best score never leaves this device.</p>
        </footer>
      </div>

      <VictoryModal
        open={game.celebrating}
        result={game.result}
        best={game.best}
        isNewBest={isNewBest}
        onRestart={game.restart}
        onClose={game.dismissCelebration}
      />
    </div>
  );
}
