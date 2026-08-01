import React from "react";
import { colors, fonts } from "./theme";

/** Page chrome shared by every non-audit surface. Matches the audit's shell. */
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100%", background: colors.bg, fontFamily: fonts.sans }}>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        a { color: inherit; }
        input:focus-visible, button:focus-visible, a:focus-visible, select:focus-visible, textarea:focus-visible {
          outline: 2px solid ${colors.gold};
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .spin { animation: none; }
          * { transition: none !important; }
        }
      `}</style>
      {children}
    </div>
  );
}

/** Centred single-column layout used by the auth screens. */
export function CenteredPanel({
  children,
  maxWidth = 420,
}: {
  children: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <div
      style={{
        maxWidth,
        margin: "0 auto",
        padding: "clamp(32px, 8vw, 72px) 24px",
      }}
    >
      {children}
    </div>
  );
}
