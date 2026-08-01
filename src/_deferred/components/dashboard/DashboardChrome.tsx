import React from "react";
import Link from "next/link";
import { Shell } from "@/components/ui/Shell";
import { colors, fonts } from "@/components/ui/theme";

/** Header + nav shared by every signed-in surface. */
export function DashboardChrome({
  email,
  isStaff,
  children,
}: {
  email: string;
  isStaff?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Shell>
      <header
        style={{
          borderBottom: `1px solid ${colors.surfaceAlt}`,
          padding: "18px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            fontFamily: fonts.sans,
            fontSize: 12,
            letterSpacing: 3,
            color: colors.gold,
            textDecoration: "none",
          }}
        >
          RAKESHPROTECH
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <Link href="/dashboard" style={navLink}>Dashboard</Link>
          <Link href="/dashboard/history" style={navLink}>History</Link>
          {isStaff && <Link href="/admin" style={navLink}>Admin</Link>}
          <span style={{ color: colors.muted, fontSize: 13 }}>{email}</span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              style={{
                background: "transparent",
                border: `1px solid ${colors.border}`,
                color: colors.mutedAlt,
                borderRadius: 8,
                padding: "7px 14px",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: fonts.sans,
              }}
            >
              Sign out
            </button>
          </form>
        </nav>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "clamp(24px, 6vw, 48px) 24px 80px" }}>
        {children}
      </main>
    </Shell>
  );
}

const navLink: React.CSSProperties = {
  color: colors.mutedAlt,
  fontSize: 14,
  textDecoration: "none",
};

export function PageTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      <div style={{ fontFamily: fonts.sans, fontSize: 12, letterSpacing: 3, color: colors.gold, marginBottom: 10 }}>
        {eyebrow}
      </div>
      <h1
        style={{
          fontFamily: fonts.serif,
          fontSize: "clamp(24px, 5vw, 32px)",
          color: colors.text,
          margin: "0 0 32px",
          lineHeight: 1.2,
        }}
      >
        {title}
      </h1>
    </>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        padding: "32px 24px",
        textAlign: "center",
      }}
    >
      <p style={{ color: colors.text, fontWeight: 600, marginBottom: 8, fontSize: 16 }}>{title}</p>
      <p style={{ color: colors.muted, fontSize: 14, margin: "0 0 20px", lineHeight: 1.6 }}>{body}</p>
      {action}
    </div>
  );
}
