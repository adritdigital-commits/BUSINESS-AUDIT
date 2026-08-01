"use client";

import { forwardRef } from "react";
import { CardSymbol } from "@/components/game/CardSymbol";
import { symbolFor } from "@/lib/game/deck";
import { cn } from "@/lib/cn";

/**
 * One card.
 *
 * A real `<button>`, so it is reachable by Tab, activated by Enter and Space,
 * and announced with its state — none of which has to be reimplemented. The
 * flip is a 3D rotation of a two-faced box: both faces are always in the DOM,
 * so the symbol is not mounted and unmounted on every turn.
 *
 * `aria-label` deliberately does not name the symbol on a face-down card. The
 * label is the game.
 */

interface MemoryCardProps {
  symbolId: string;
  index: number;
  flipped: boolean;
  matched: boolean;
  missed: boolean;
  disabled: boolean;
  onFlip: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}

export const MemoryCard = forwardRef<HTMLButtonElement, MemoryCardProps>(
  function MemoryCard(
    { symbolId, index, flipped, matched, missed, disabled, onFlip, onKeyDown },
    ref
  ) {
    const symbol = symbolFor(symbolId);
    const label = matched
      ? `Card ${index + 1}, matched: ${symbol.label}`
      : flipped
        ? `Card ${index + 1}, showing ${symbol.label}`
        : `Card ${index + 1}, face down. Activate to turn over.`;

    return (
      <button
        ref={ref}
        type="button"
        onClick={onFlip}
        onKeyDown={onKeyDown}
        disabled={disabled}
        aria-label={label}
        aria-pressed={flipped}
        data-testid="memory-card"
        data-state={matched ? "matched" : flipped ? "flipped" : "down"}
        className={cn(
          "group relative aspect-[3/4] w-full rounded-xl [perspective:1200px]",
          "transition-transform duration-200",
          !disabled && "hover:-translate-y-0.5 active:translate-y-0",
          matched && "cursor-default",
          missed && "animate-card-shake"
        )}
      >
        <span
          className={cn(
            "relative block h-full w-full rounded-xl",
            "transition-transform duration-500 [transform-style:preserve-3d]",
            "motion-reduce:duration-150",
            flipped && "[transform:rotateY(180deg)]"
          )}
        >
          {/* ------------------------------------------------ face down */}
          <span
            className={cn(
              "absolute inset-0 grid place-items-center overflow-hidden rounded-xl",
              "border border-white/10 bg-white/[0.045] backdrop-blur-md",
              "shadow-[0_1px_0_rgba(255,255,255,0.10)_inset,0_14px_30px_-22px_rgba(0,0,0,0.95)]",
              "[backface-visibility:hidden] [-webkit-backface-visibility:hidden]",
              !disabled &&
                "group-hover:border-[color:var(--accent-line)] group-hover:bg-white/[0.07]"
            )}
          >
            <span
              aria-hidden
              className="absolute inset-0 opacity-70 [background:radial-gradient(120%_90%_at_50%_0%,rgba(229,179,58,0.14),transparent_62%)]"
            />
            <svg
              viewBox="0 0 24 24"
              className="relative size-1/3 text-accent opacity-50 transition-opacity duration-200 group-hover:opacity-90"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.3}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              focusable="false"
            >
              <path d="M12 2.6 21.4 12 12 21.4 2.6 12 12 2.6Z" />
              <path d="M12 7.3 16.7 12 12 16.7 7.3 12 12 7.3Z" />
            </svg>
          </span>

          {/* -------------------------------------------------- face up */}
          <span
            className={cn(
              "absolute inset-0 grid place-items-center overflow-hidden rounded-xl",
              "border backdrop-blur-md [transform:rotateY(180deg)]",
              "[backface-visibility:hidden] [-webkit-backface-visibility:hidden]",
              matched
                ? "border-[color:var(--accent-line-strong)] bg-[color:var(--accent-fill)]"
                : missed
                  ? "border-[color:var(--critical-line)] bg-[color:var(--critical-fill)]"
                  : "border-white/15 bg-white/[0.08]"
            )}
          >
            <span
              aria-hidden
              className="absolute inset-0 opacity-80"
              style={{
                background: `radial-gradient(110% 80% at 50% 8%, ${symbol.tint}22, transparent 64%)`,
              }}
            />
            <CardSymbol
              symbolId={symbolId}
              className={cn(
                "relative size-1/2 transition-transform duration-300",
                matched && "scale-105"
              )}
            />
            {matched ? (
              <span
                aria-hidden
                className="absolute bottom-1.5 right-2 text-[10px] font-medium tracking-wide text-[color:var(--accent-ink-soft)]"
              >
                ✓
              </span>
            ) : null}
          </span>
        </span>
      </button>
    );
  }
);
