"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

/**
 * The title block and the two controls that are always available: restart, and
 * sound. Both are ordinary buttons with real labels — the icons are decoration.
 */
export function GameHeader({
  pairsFound,
  pairTotal,
  soundOn,
  onRestart,
  onToggleSound,
}: {
  pairsFound: number;
  pairTotal: number;
  soundOn: boolean;
  onRestart: () => void;
  onToggleSound: () => void;
}) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">Memory</Badge>
          <Badge>
            {pairsFound} of {pairTotal} pairs
          </Badge>
        </div>
        <h1 className="mt-4 text-[clamp(1.9rem,5vw,2.75rem)] font-semibold leading-[1.08] tracking-tight text-ink">
          Twelve pairs.
          <span className="text-ink-muted"> One clear head.</span>
        </h1>
        <p className="mt-3 max-w-prose text-[14.5px] leading-relaxed text-ink-secondary">
          Turn two cards. If they match they stay. Fewest moves wins — the clock
          only breaks a tie.
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onToggleSound}
          aria-pressed={soundOn}
          title={soundOn ? "Sound on" : "Sound off"}
        >
          <SoundIcon on={soundOn} />
          {soundOn ? "Sound on" : "Sound off"}
        </Button>
        <Button size="sm" onClick={onRestart}>
          <svg
            viewBox="0 0 16 16"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M13.5 8a5.5 5.5 0 1 1-1.9-4.15M13.5 2v3h-3" />
          </svg>
          Restart
        </Button>
      </div>
    </header>
  );
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h2.2L8.5 3v10L5.2 10H3V6Z" />
      {on ? <path d="M11 5.8a3 3 0 0 1 0 4.4M12.8 4a5.4 5.4 0 0 1 0 8" /> : <path d="m11 6.5 3 3m0-3-3 3" />}
    </svg>
  );
}
