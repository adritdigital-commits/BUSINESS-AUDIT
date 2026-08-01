import { symbolFor } from "@/lib/game/deck";

/**
 * The twelve faces.
 *
 * Line art rather than emoji: emoji render differently on every platform, and
 * two of them can end up looking near-identical at card size — which would
 * make the game harder for reasons that have nothing to do with memory. Each
 * shape here is unmistakable at 40px, and the tint is applied on top of a
 * shape that already stands alone.
 */

const PATHS: Record<string, React.ReactNode> = {
  diamond: <path d="M12 3 5 9.6 12 21l7-11.4L12 3ZM5 9.6h14M12 3l-3.4 6.6L12 21l3.4-11.4L12 3Z" />,
  crown: (
    <path d="M4 17h16M4 17 3 7l5 3.5L12 4l4 6.5L21 7l-1 10M8 13.5h8" />
  ),
  key: (
    <path d="M14.5 3a5 5 0 1 0-3.1 8.9L4 19.3V21h3v-2h2v-2h2l1.4-1.4A5 5 0 0 0 14.5 3Zm.8 4.2h.01" />
  ),
  anchor: (
    <path d="M12 8v13m0 0a8 8 0 0 0 8-8m-8 8a8 8 0 0 1-8-8m4-2h8M12 3a2.2 2.2 0 1 0 0 4.4A2.2 2.2 0 0 0 12 3Z" />
  ),
  feather: (
    <path d="M20 4c-7 0-12 4.2-12 10.5V19M20 4c0 7-4.6 11-10 11M4 21l6-6m-1.5-2.5H14M10 9h5" />
  ),
  moon: <path d="M20 14.5A8.6 8.6 0 0 1 9.5 4a8.6 8.6 0 1 0 10.5 10.5Z" />,
  compass: (
    <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.6-12.6-2.1 5.1-5.1 2.1 2.1-5.1 5.1-2.1Z" />
  ),
  hourglass: (
    <path d="M7 3h10M7 21h10M7 3v3.2c0 1 .5 2 1.4 2.6L12 11l3.6-2.2A3 3 0 0 0 17 6.2V3M7 21v-3.2c0-1 .5-2 1.4-2.6L12 13l3.6 2.2a3 3 0 0 1 1.4 2.6V21" />
  ),
  leaf: (
    <path d="M4 20c0-8.3 5.3-14 16-14 0 9.7-5.5 14-11 14H4Zm4-2c1.8-4.6 4.8-7.6 9-9.5" />
  ),
  bolt: <path d="M13.5 2 4 13.8h6.3L10 22l9.5-11.8h-6.3L13.5 2Z" />,
  star: (
    <path d="m12 3 2.7 5.7 6.3.9-4.5 4.5 1 6.4-5.5-3-5.5 3 1-6.4L3 9.6l6.3-.9L12 3Z" />
  ),
  orbit: (
    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.6-9.9c1.4 1.4-1 6-5.3 10.3-4.3 4.3-8.9 6.7-10.3 5.3-1.4-1.4 1-6 5.3-10.3 4.3-4.3 8.9-6.7 10.3-5.3Z" />
  ),
};

export function CardSymbol({ symbolId, className }: { symbolId: string; className?: string }) {
  const symbol = symbolFor(symbolId);

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      style={{ color: symbol.tint }}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      {PATHS[symbolId] ?? PATHS.diamond}
    </svg>
  );
}
