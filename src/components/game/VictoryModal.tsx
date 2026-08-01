"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { formatClock, type GameResult } from "@/lib/game/engine";
import type { BestScore } from "@/lib/game/storage";
import { cn } from "@/lib/cn";

/**
 * The celebration.
 *
 * A real modal dialog: focus moves into it on open, Escape closes it, Tab is
 * kept inside it, and the page behind is inert to assistive technology. The
 * confetti is decorative and hidden from the accessibility tree, and it is
 * suppressed entirely under `prefers-reduced-motion` by the global rule in
 * globals.css that flattens animation durations.
 */

const CONFETTI_COUNT = 28;

/**
 * Deterministic placement from the index — the modal only ever renders on the
 * client, but a fixed pattern is still preferable to `Math.random()` in a
 * render body, which would produce a different result on every re-render.
 */
function confettiStyle(index: number): React.CSSProperties {
  const tints = ["#e5b33a", "#f0c975", "#9ec9c4", "#dcd3f0", "#8fa6e0", "#8fc79a"];
  const spread = (index * 37) % 100;
  const delay = ((index * 53) % 900) / 1000;
  const duration = 2.1 + ((index * 29) % 120) / 100;
  const drift = ((index * 41) % 60) - 30;

  return {
    left: `${spread}%`,
    backgroundColor: tints[index % tints.length],
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    transform: `translateX(${drift}px)`,
    width: index % 3 === 0 ? "5px" : "7px",
    height: index % 4 === 0 ? "12px" : "7px",
  };
}

export function VictoryModal({
  open,
  result,
  best,
  isNewBest,
  onRestart,
  onClose,
}: {
  open: boolean;
  result: GameResult | null;
  best: BestScore | null;
  isNewBest: boolean;
  onRestart: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open || !result) return null;

  const perfect = result.moves === 12;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-sm" aria-hidden />

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: CONFETTI_COUNT }, (_, index) => (
          <span
            key={index}
            className="absolute -top-6 animate-confetti rounded-[2px] opacity-90"
            style={confettiStyle(index)}
          />
        ))}
      </div>

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="victory-title"
        className={cn(
          "animate-pop relative w-full max-w-md rounded-panel border border-white/12",
          "bg-white/[0.07] p-6 text-center backdrop-blur-2xl sm:p-8",
          "shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_40px_90px_-40px_rgba(0,0,0,1)]"
        )}
      >
        <div
          aria-hidden
          className="absolute inset-0 rounded-panel opacity-80 [background:radial-gradient(120%_70%_at_50%_0%,rgba(229,179,58,0.20),transparent_62%)]"
        />

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--accent-line)] bg-[color:var(--accent-fill)] px-3 py-1 text-[11px] font-medium text-accent">
            {isNewBest ? "New personal best" : perfect ? "Flawless" : "Cleared"}
          </span>

          <h2 id="victory-title" className="mt-5 text-[28px] font-semibold leading-tight text-ink">
            All twelve pairs found
          </h2>
          <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-secondary">
            {perfect
              ? "Twelve moves for twelve pairs. That is the theoretical minimum — you did not waste a single guess."
              : isNewBest
                ? "Your best game so far. It is stored on this device only."
                : "Solved. The board reshuffles every time, so a rerun is a genuinely new game."}
          </p>

          <dl className="mt-6 grid grid-cols-3 gap-3">
            <Figure label="Moves" value={String(result.moves)} highlight />
            <Figure label="Time" value={formatClock(result.seconds * 1000)} />
            <Figure label="Best" value={best ? String(best.moves) : String(result.moves)} />
          </dl>

          <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-center">
            <Button variant="secondary" size="md" onClick={onClose}>
              Review the board
            </Button>
            <Button data-autofocus size="md" onClick={onRestart}>
              Play again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Figure({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-card border border-white/10 bg-white/[0.05] px-3 py-3">
      <dt className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </dt>
      <dd
        className={cn(
          "tabular mt-1 text-[22px] font-semibold leading-none",
          highlight ? "text-accent" : "text-ink"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
