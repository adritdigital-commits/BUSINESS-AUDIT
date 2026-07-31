"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CenteredPanel, Shell } from "@/components/ui/Shell";
import { btnPrimary, colors, eyebrow, fonts, input, label } from "@/components/ui/theme";

export type AuthMode = "login" | "register" | "forgot" | "reset";

const COPY: Record<AuthMode, { title: string; blurb: string; cta: string; busy: string }> = {
  login: {
    title: "Welcome back.",
    blurb: "Sign in to see your audit history, reports, and proposals.",
    cta: "Sign in",
    busy: "Signing in…",
  },
  register: {
    title: "Create your account.",
    blurb: "Keep your audit results, track progress over time, and receive your roadmap.",
    cta: "Create account",
    busy: "Creating account…",
  },
  forgot: {
    title: "Reset your password.",
    blurb: "We'll email you a link to choose a new password.",
    cta: "Send reset link",
    busy: "Sending…",
  },
  reset: {
    title: "Choose a new password.",
    blurb: "Pick something you haven't used elsewhere.",
    cta: "Update password",
    busy: "Updating…",
  },
};

/** Maps Supabase's error text to something a person can act on. */
function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match.";
  if (m.includes("email not confirmed")) return "Please confirm your email address first — check your inbox.";
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "An account with that email already exists. Try signing in instead.";
  }
  if (m.includes("password should be")) return "Password must be at least 8 characters.";
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  return message;
}

export default function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const copy = COPY[mode];
  const needsEmail = mode !== "reset";
  const needsPassword = mode === "login" || mode === "register" || mode === "reset";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(nextPath);
        router.refresh();
        return;
      }

      if (mode === "register") {
        if (password.length < 8) throw new Error("Password should be at least 8 characters.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // `full_name` lands in raw_user_meta_data, which the
            // handle_new_user trigger copies onto the profile. Role is
            // deliberately not settable here.
            data: { full_name: fullName || undefined },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        });
        if (error) throw error;

        if (data.session) {
          router.push(nextPath);
          router.refresh();
          return;
        }
        setNotice("Check your email to confirm your account, then sign in.");
        return;
      }

      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });
        if (error) throw error;
        // Deliberately not revealing whether the address exists.
        setNotice("If an account exists for that address, a reset link is on its way.");
        return;
      }

      if (password.length < 8) throw new Error("Password should be at least 8 characters.");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setNotice("Password updated. Redirecting…");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : "Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <CenteredPanel>
        <div style={eyebrow}>RAKESHPROTECH &nbsp;·&nbsp; BUSINESS GROWTH AUDIT</div>
        <h1
          style={{
            fontFamily: fonts.serif,
            fontSize: "clamp(26px, 5vw, 34px)",
            color: colors.text,
            margin: "0 0 12px",
            lineHeight: 1.2,
          }}
        >
          {copy.title}
        </h1>
        <p style={{ color: colors.mutedAlt, fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
          {copy.blurb}
        </p>

        <form onSubmit={onSubmit} noValidate>
          {mode === "register" && (
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="fullName" style={label}>Your name</label>
              <input
                id="fullName"
                name="fullName"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={busy}
                style={input}
              />
            </div>
          )}

          {needsEmail && (
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="email" style={label}>Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                style={input}
              />
            </div>
          )}

          {needsPassword && (
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="password" style={label}>
                {mode === "reset" ? "New password" : "Password"}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                style={input}
              />
              {mode !== "login" && (
                <p style={{ color: colors.muted, fontSize: 12.5, marginTop: 8 }}>
                  At least 8 characters.
                </p>
              )}
            </div>
          )}

          {error && (
            <p role="alert" style={{ color: colors.red, fontSize: 14, marginBottom: 16 }}>
              {error}
            </p>
          )}
          {notice && (
            <p role="status" style={{ color: colors.green, fontSize: 14, marginBottom: 16 }}>
              {notice}
            </p>
          )}

          <button type="submit" disabled={busy} style={{ ...btnPrimary, width: "100%", opacity: busy ? 0.6 : 1 }}>
            {busy ? (
              <>
                {copy.busy} <Loader2 size={15} className="spin" style={{ verticalAlign: "-2px" }} aria-hidden />
              </>
            ) : (
              copy.cta
            )}
          </button>
        </form>

        <div style={{ marginTop: 28, fontSize: 14, color: colors.muted, display: "flex", flexDirection: "column", gap: 10 }}>
          {mode === "login" && (
            <>
              <Link href="/forgot-password" style={{ color: colors.mutedAlt }}>Forgot your password?</Link>
              <span>
                Don&apos;t have an account?{" "}
                <Link href="/register" style={{ color: colors.gold }}>Create one</Link>
              </span>
            </>
          )}
          {mode === "register" && (
            <span>
              Already have an account?{" "}
              <Link href="/login" style={{ color: colors.gold }}>Sign in</Link>
            </span>
          )}
          {(mode === "forgot" || mode === "reset") && (
            <Link href="/login" style={{ color: colors.gold }}>Back to sign in</Link>
          )}
          <Link href="/" style={{ color: colors.muted }}>← Take the audit without an account</Link>
        </div>
      </CenteredPanel>
    </Shell>
  );
}
