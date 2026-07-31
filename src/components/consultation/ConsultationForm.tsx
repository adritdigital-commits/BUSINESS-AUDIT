"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { ApiError } from "@/lib/apiClient";
import { btnGhost, btnPrimary, colors, fonts, input, label } from "@/components/ui/theme";

const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL;

export interface ConsultationFormProps {
  assessmentId?: string | null;
  token?: string | null;
  defaultName?: string | null;
  defaultEmail?: string | null;
}

/**
 * Consultation request. When a Calendly URL is configured we show the
 * scheduler; otherwise the request is stored for staff to follow up, so
 * the feature works with no third-party dependency.
 */
export default function ConsultationForm({
  assessmentId,
  token,
  defaultName,
  defaultEmail,
}: ConsultationFormProps) {
  const [name, setName] = useState(defaultName ?? "");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [phone, setPhone] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [message, setMessage] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          preferredTime: preferredTime || undefined,
          message: message || undefined,
          assessmentId: assessmentId || undefined,
          token: token || undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new ApiError(body?.error ?? "Request failed", response.status);
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : "Couldn't send your request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div
        role="status"
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          padding: "28px 24px",
        }}
      >
        <h2 style={{ fontFamily: fonts.serif, fontSize: 20, color: colors.text, margin: "0 0 10px" }}>
          Request received.
        </h2>
        <p style={{ color: colors.mutedAlt, fontSize: 14.5, lineHeight: 1.6, margin: "0 0 20px" }}>
          One of our consultants will be in touch at <strong style={{ color: colors.text }}>{email}</strong> to
          confirm a time. If you shared a preferred slot, we&apos;ll try that first.
        </p>
        {CALENDLY_URL && (
          <p style={{ color: colors.mutedAlt, fontSize: 14, marginBottom: 20 }}>
            Prefer to pick a slot now?{" "}
            <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" style={{ color: colors.gold }}>
              Open the scheduler
            </a>
          </p>
        )}
        <Link href="/dashboard" style={{ ...btnGhost, textDecoration: "none", display: "inline-block" }}>
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <>
      {CALENDLY_URL && (
        <div style={{ marginBottom: 32 }}>
          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...btnPrimary, textDecoration: "none", display: "inline-block" }}
          >
            Pick a time now →
          </a>
          <p style={{ color: colors.muted, fontSize: 13, marginTop: 14 }}>
            Or send a request below and we&apos;ll come back to you.
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="c-name" style={label}>Your name</label>
          <input id="c-name" required value={name} onChange={(e) => setName(e.target.value)} disabled={busy} style={input} autoComplete="name" />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label htmlFor="c-email" style={label}>Email address</label>
          <input id="c-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} style={input} autoComplete="email" />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label htmlFor="c-phone" style={label}>Phone <span style={{ color: colors.muted }}>(optional)</span></label>
          <input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={busy} style={input} autoComplete="tel" />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label htmlFor="c-time" style={label}>Preferred time <span style={{ color: colors.muted }}>(optional)</span></label>
          <input
            id="c-time"
            placeholder="e.g. weekday mornings"
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            disabled={busy}
            style={input}
          />
        </div>

        <div style={{ marginBottom: 22 }}>
          <label htmlFor="c-message" style={label}>What would you like to focus on? <span style={{ color: colors.muted }}>(optional)</span></label>
          <textarea
            id="c-message"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={busy}
            style={{ ...input, resize: "vertical", lineHeight: 1.5 }}
          />
        </div>

        {error && (
          <p role="alert" style={{ color: colors.red, fontSize: 14, marginBottom: 16 }}>{error}</p>
        )}

        <button type="submit" disabled={busy} style={{ ...btnPrimary, width: "100%", opacity: busy ? 0.6 : 1 }}>
          {busy ? (
            <>Sending… <Loader2 size={15} className="spin" style={{ verticalAlign: "-2px" }} aria-hidden /></>
          ) : (
            "Request a consultation"
          )}
        </button>
      </form>
    </>
  );
}
