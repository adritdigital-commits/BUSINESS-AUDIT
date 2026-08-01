import type { GameResult } from "@/lib/game/engine";

/**
 * Best score persistence.
 *
 * Same defensive posture as the audit's storage: anything already in the key
 * may have been written by an older build, hand-edited, or truncated, so every
 * field is validated before it is trusted.
 */

export const BEST_KEY = "rakeshprotech.game.best.v1";
export const SOUND_KEY = "rakeshprotech.game.sound.v1";

export interface BestScore extends GameResult {
  achievedAt: string;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parseBest(raw: string | null): BestScore | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (!isFiniteNumber(record.moves) || !isFiniteNumber(record.seconds)) return null;
    if (record.moves <= 0 || record.seconds < 0) return null;
    return {
      moves: Math.round(record.moves),
      seconds: Math.round(record.seconds),
      achievedAt: typeof record.achievedAt === "string" ? record.achievedAt : "",
    };
  } catch {
    return null;
  }
}

/** Fewer moves wins; a tie is broken by the faster clock. */
export function isBetter(candidate: GameResult, best: BestScore | null): boolean {
  if (!best) return true;
  if (candidate.moves !== best.moves) return candidate.moves < best.moves;
  return candidate.seconds < best.seconds;
}

export function readBest(): BestScore | null {
  try {
    return parseBest(window.localStorage.getItem(BEST_KEY));
  } catch {
    // Private browsing, disabled storage, quota — the game still plays.
    return null;
  }
}

export function writeBest(score: BestScore): void {
  try {
    window.localStorage.setItem(BEST_KEY, JSON.stringify(score));
  } catch {
    /* Nothing to do: a lost high score must never break the game. */
  }
}

export function clearBest(): void {
  try {
    window.localStorage.removeItem(BEST_KEY);
  } catch {
    /* As above. */
  }
}

export function readSoundPreference(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function writeSoundPreference(enabled: boolean): void {
  try {
    window.localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
  } catch {
    /* As above. */
  }
}
