"use client";

import { formatClock } from "@/lib/game/engine";
import type { BestScore } from "@/lib/game/storage";
import { cn } from "@/lib/cn";

/**
 * Timer, moves, progress and personal best.
 *
 * The clock is `aria-live="off"` on purpose — a value that changes four times
 * a second would make a screen reader unusable. Progress is announced instead,
 * because that is the part a player needs told to them.
 */
export function ScoreBoard({
  elapsed,
  moves,
  pairsFound,
  pairTotal,
  accuracy,
  best,
  running,
}: {
  elapsed: number;
  moves: number;
  pairsFound: number;
  pairTotal: number;
  accuracy: number;
  best: BestScore | null;
  running: boolean;
}) {
  const progress = Math.round((pairsFound / pairTotal) * 100);

  return (
    <section
      aria-label="Score"
      className={cn(
        "rounded-panel border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl sm:p-5",
        "shadow-[0_1px_0_rgba(255,255,255,0.07)_inset,0_24px_60px_-40px_rgba(0,0,0,1)]"
      )}
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
        <Stat
          label="Time"
          value={formatClock(elapsed)}
          hint={running ? "Running" : elapsed > 0 ? "Stopped" : "Starts on your first card"}
        />
        <Stat label="Moves" value={String(moves)} hint={`${pairTotal} is a perfect game`} />
        <Stat
          label="Pairs"
          value={`${pairsFound}/${pairTotal}`}
          hint={moves > 0 ? `${accuracy}% of guesses landed` : "None yet"}
        />
        <Stat
          label="Personal best"
          value={best ? `${best.moves}` : "—"}
          hint={best ? `moves, in ${formatClock(best.seconds * 1000)}` : "Win a game to set one"}
          accent={Boolean(best)}
        />
      </dl>

      <div className="mt-5">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Pairs found"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${Math.max(progress, 1)}%` }}
          />
        </div>
        <p className="sr-only" aria-live="polite">
          {pairsFound} of {pairTotal} pairs found in {moves} moves.
        </p>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </dt>
      <dd
        className={cn(
          "tabular mt-1.5 text-[26px] font-semibold leading-none",
          accent ? "text-accent" : "text-ink"
        )}
      >
        {value}
      </dd>
      <p className="mt-1.5 truncate text-[12px] text-ink-muted">{hint}</p>
    </div>
  );
}
