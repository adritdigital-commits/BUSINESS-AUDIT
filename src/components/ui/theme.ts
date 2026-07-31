import type { CSSProperties } from "react";

/**
 * Design tokens lifted from the audit UI so every new surface matches it
 * exactly. AuditApp keeps its own inline styles untouched; this is the
 * shared vocabulary for everything built after it.
 */
export const colors = {
  bg: "#0B0F14",
  surface: "#151A20",
  surfaceAlt: "#20262E",
  border: "#2A313B",
  text: "#F2F4F3",
  muted: "#8A93A0",
  mutedAlt: "#9AA3AF",
  gold: "#C9A227",
  green: "#3E7A5C",
  red: "#C9432F",
} as const;

export const fonts = {
  serif: "'Fraunces', serif",
  sans: "Inter, -apple-system, sans-serif",
} as const;

export function scoreColor(score: number) {
  if (score >= 70) return colors.green;
  if (score >= 40) return colors.gold;
  return colors.red;
}

export const btnPrimary: CSSProperties = {
  background: colors.gold,
  color: colors.surface,
  border: "none",
  padding: "14px 28px",
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: fonts.sans,
};

export const btnGhost: CSSProperties = {
  background: "transparent",
  color: colors.mutedAlt,
  border: `1px solid ${colors.border}`,
  padding: "12px 20px",
  borderRadius: 10,
  fontSize: 14,
  cursor: "pointer",
  fontFamily: fonts.sans,
};

export const input: CSSProperties = {
  width: "100%",
  padding: "14px 18px",
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  background: colors.surface,
  color: colors.text,
  fontSize: 15,
  outline: "none",
  fontFamily: fonts.sans,
};

export const card: CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.surfaceAlt}`,
  borderRadius: 10,
  padding: "16px 18px",
};

export const label: CSSProperties = {
  display: "block",
  fontSize: 13,
  color: colors.muted,
  marginBottom: 8,
  fontFamily: fonts.sans,
};

export const eyebrow: CSSProperties = {
  fontFamily: fonts.sans,
  fontSize: 12,
  letterSpacing: 3,
  color: colors.gold,
  marginBottom: 18,
};

export const srOnly: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};
