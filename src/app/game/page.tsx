import type { Metadata } from "next";
import { GameBoard } from "@/components/game/GameBoard";

/**
 * A standalone page. It shares the site's palette and primitives, and nothing
 * else — it reads no audit state, and the audit reads none of its state.
 */

export const metadata: Metadata = {
  title: "Memory",
  description:
    "A twelve-pair memory game. Timed, scored, and playable entirely offline — nothing is sent anywhere.",
};

export default function GamePage() {
  return (
    <main>
      <GameBoard />
    </main>
  );
}
