"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { orderedDeck, shuffle } from "@/lib/game/deck";
import {
  accuracy,
  elapsedMs,
  flip as applyFlip,
  initialState,
  resolve as applyResolve,
  restart as applyRestart,
  resultOf,
  type FlipOutcome,
  type GameState,
} from "@/lib/game/engine";
import { play, type Cue } from "@/lib/game/sound";
import {
  isBetter,
  readBest,
  readSoundPreference,
  writeBest,
  writeSoundPreference,
  type BestScore,
} from "@/lib/game/storage";

/** How long a mismatched pair stays face up before turning back. */
const MISMATCH_DELAY_MS = 900;

/** Flip outcomes and audio cues are separate vocabularies; this is the map. */
const CUE_FOR: Record<Exclude<FlipOutcome, "ignored">, Cue> = {
  revealed: "flip",
  matched: "match",
  missed: "miss",
  won: "win",
};

/**
 * Everything the board needs, and nothing it does not.
 *
 * Hydration safety, same approach as the audit: the first render on the server
 * and the first render on the client are identical — canonical deck order, no
 * stored best score — and both are adopted in an effect afterwards. Cards start
 * face down, so a reshuffled deck is not observable.
 */
export function useMemoryGame() {
  const [state, setState] = useState<GameState>(() => initialState());
  const [best, setBest] = useState<BestScore | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);
  const [celebrating, setCelebrating] = useState(false);

  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  const cue = useCallback((name: Cue) => {
    if (soundRef.current) play(name);
  }, []);

  // ------------------------------------------------------------- mount
  useEffect(() => {
    setState((current) => ({ ...current, deck: shuffle(orderedDeck()) }));
    setBest(readBest());
    setSoundOn(readSoundPreference());
    setReady(true);
  }, []);

  // ------------------------------------------------------------- clock
  // Only ticks while a game is actually in progress.
  const running = state.startedAt !== null && state.status !== "won";
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [running]);

  // --------------------------------------------------- mismatch cleanup
  useEffect(() => {
    if (state.status !== "resolving") return;
    const timer = window.setTimeout(() => setState(applyResolve), MISMATCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [state.status, state.resolveToken]);

  // ------------------------------------------------------ win handling
  const result = resultOf(state);
  useEffect(() => {
    if (!result) {
      setCelebrating(false);
      return;
    }
    setCelebrating(true);
    setBest((current) => {
      if (!isBetter(result, current)) return current;
      const next: BestScore = { ...result, achievedAt: new Date().toISOString() };
      writeBest(next);
      return next;
    });
  }, [result?.moves, result?.seconds]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------ actions
  const flipCard = useCallback(
    (cardId: string) => {
      setState((current) => {
        const { state: next, outcome } = applyFlip(current, cardId, Date.now());
        if (outcome === "ignored") return current;
        cue(CUE_FOR[outcome]);
        return next;
      });
    },
    [cue]
  );

  const restart = useCallback(() => {
    setCelebrating(false);
    setState(applyRestart(shuffle(orderedDeck())));
    setNow(0);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundOn((current) => {
      const next = !current;
      writeSoundPreference(next);
      if (next) play("flip");
      return next;
    });
  }, []);

  const dismissCelebration = useCallback(() => setCelebrating(false), []);

  // ------------------------------------------------------------ derived
  const elapsed = elapsedMs(state, now || Date.now());
  const view = useMemo(
    () => ({
      isFlipped: (cardId: string) =>
        state.flipped.includes(cardId) || state.matched.includes(cardId),
      isMatched: (cardId: string) => state.matched.includes(cardId),
      isMissed: (cardId: string) =>
        state.status === "resolving" && state.flipped.includes(cardId),
      /** A third flip during the pause is ignored, so say so in the UI. */
      locked: state.status === "resolving" || state.status === "won",
    }),
    [state.flipped, state.matched, state.status]
  );

  return {
    state,
    ready,
    best,
    soundOn,
    celebrating,
    result,
    elapsed,
    pairsFound: state.matched.length / 2,
    accuracy: accuracy(state),
    view,
    flipCard,
    restart,
    toggleSound,
    dismissCelebration,
  };
}

export type MemoryGame = ReturnType<typeof useMemoryGame>;
