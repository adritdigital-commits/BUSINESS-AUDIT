"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import type { ApiCategory, ApiQuestion } from "@/lib/apiClient";
import { ApiError, auditApi } from "@/lib/apiClient";
import { btnGhost, btnPrimary, colors, fonts, input, label } from "@/components/ui/theme";

type Busy = { kind: "question" | "category"; id: string } | null;

/**
 * Category and question management over the existing admin API. Ordering
 * uses the bulk /reorder endpoints so a move is one request, not N.
 */
export default function QuestionManager() {
  const [categories, setCategories] = useState<ApiCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    auditApi
      .getCategories(controller.signal)
      .then((next) => {
        setCategories(next);
        setExpanded((current) => current ?? next[0]?.id ?? null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof ApiError ? err.userMessage : "Couldn't load the question bank.");
      });
    return () => controller.abort();
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  async function call(path: string, init: RequestInit) {
    const response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
    if (!response.ok && response.status !== 204) {
      const body = await response.json().catch(() => null);
      throw new ApiError(body?.error ?? "Request failed", response.status);
    }
  }

  async function moveQuestion(category: ApiCategory, index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= category.questions.length) return;

    const reordered = [...category.questions];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    setBusy({ kind: "question", id: category.questions[index].id });
    setError(null);
    try {
      await call("/api/questions/reorder", {
        method: "POST",
        body: JSON.stringify({
          items: reordered.map((q, i) => ({ id: q.id, order: i })),
        }),
      });
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : "Couldn't reorder.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteQuestion(question: ApiQuestion) {
    if (!window.confirm(`Delete "${question.text}"? Its options are removed too. This cannot be undone.`)) {
      return;
    }
    setBusy({ kind: "question", id: question.id });
    setError(null);
    try {
      await call(`/api/questions/${question.id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : "Couldn't delete that question.");
    } finally {
      setBusy(null);
    }
  }

  if (error && !categories) {
    return (
      <div role="alert" style={panel}>
        <p style={{ color: colors.text, marginBottom: 16 }}>{error}</p>
        <button onClick={reload} style={btnGhost}>Try again</button>
      </div>
    );
  }

  if (!categories) {
    return (
      <div role="status" style={{ display: "flex", gap: 10, alignItems: "center", color: colors.muted, padding: "32px 0" }}>
        <Loader2 size={18} className="spin" aria-hidden /> Loading the question bank…
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div style={panel}>
        <p style={{ color: colors.text, fontWeight: 600, marginBottom: 8 }}>No categories yet</p>
        <p style={{ color: colors.muted, fontSize: 14, margin: 0 }}>
          Run <code>npm run db:seed</code> to load the starter question bank, or add a category below.
        </p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <p role="alert" style={{ color: colors.red, fontSize: 14, marginBottom: 16 }}>{error}</p>
      )}

      <NewCategoryForm onCreated={reload} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {categories.map((category) => {
          const open = expanded === category.id;
          return (
            <section key={category.id} style={{ ...panel, padding: 0, overflow: "hidden" }}>
              <button
                onClick={() => setExpanded(open ? null : category.id)}
                aria-expanded={open}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  padding: "16px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  color: colors.text,
                  fontFamily: fonts.sans,
                }}
              >
                <span>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{category.name}</span>
                  <span style={{ color: colors.muted, fontSize: 13, marginLeft: 10 }}>
                    {category.questions.length} question{category.questions.length === 1 ? "" : "s"} · weight {category.weight}
                  </span>
                </span>
                {open ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
              </button>

              {open && (
                <div style={{ borderTop: `1px solid ${colors.surfaceAlt}`, padding: "14px 18px 18px" }}>
                  {category.questions.length === 0 && (
                    <p style={{ color: colors.muted, fontSize: 14 }}>No questions in this category yet.</p>
                  )}

                  <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    {category.questions.map((question, index) => (
                      <li
                        key={question.id}
                        style={{
                          background: colors.bg,
                          border: `1px solid ${colors.surfaceAlt}`,
                          borderRadius: 8,
                          padding: "12px 14px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ color: colors.text, fontSize: 14 }}>{question.text}</div>
                          <div style={{ color: colors.muted, fontSize: 12 }}>
                            {question.type}
                            {question.options.length > 0 && ` · ${question.options.length} options`}
                            {question.showIfJson ? " · conditional" : ""}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <IconButton
                            label={`Move "${question.text}" up`}
                            disabled={index === 0 || busy !== null}
                            onClick={() => moveQuestion(category, index, -1)}
                          >
                            <ChevronUp size={15} aria-hidden />
                          </IconButton>
                          <IconButton
                            label={`Move "${question.text}" down`}
                            disabled={index === category.questions.length - 1 || busy !== null}
                            onClick={() => moveQuestion(category, index, 1)}
                          >
                            <ChevronDown size={15} aria-hidden />
                          </IconButton>
                          <IconButton
                            label={`Delete "${question.text}"`}
                            danger
                            disabled={busy !== null}
                            onClick={() => deleteQuestion(question)}
                          >
                            <Trash2 size={15} aria-hidden />
                          </IconButton>
                        </div>
                      </li>
                    ))}
                  </ol>

                  <NewQuestionForm categoryId={category.id} onCreated={reload} />
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

function IconButton({
  children,
  label: ariaLabel,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "transparent",
        border: `1px solid ${colors.border}`,
        color: danger ? colors.red : colors.mutedAlt,
        borderRadius: 6,
        padding: "6px 8px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        lineHeight: 0,
      }}
    >
      {children}
    </button>
  );
}

function NewCategoryForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!slug) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn't create the category.");
      }
      setName("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the category.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ ...panel, marginBottom: 16 }}>
      <label htmlFor="new-category" style={label}>Add a category</label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          id="new-category"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Customer Support"
          disabled={busy}
          style={{ ...input, flex: 1, minWidth: 200 }}
        />
        <button type="submit" disabled={busy || !slug} style={{ ...btnPrimary, opacity: busy || !slug ? 0.5 : 1, padding: "12px 20px" }}>
          {busy ? "Adding…" : <><Plus size={15} style={{ verticalAlign: "-2px" }} aria-hidden /> Add</>}
        </button>
      </div>
      {slug && <p style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>Slug: {slug}</p>}
      {error && <p role="alert" style={{ color: colors.red, fontSize: 13, marginTop: 8 }}>{error}</p>}
    </form>
  );
}

function NewQuestionForm({ categoryId, onCreated }: { categoryId: string; onCreated: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          text: text.trim(),
          type: "SCALE",
          scaleMin: 1,
          scaleMax: 10,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn't add the question.");
      }
      setText("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add the question.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 14, borderTop: `1px solid ${colors.surfaceAlt}`, paddingTop: 14 }}>
      <label htmlFor={`new-q-${categoryId}`} style={label}>Add a 1–10 scale question</label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          id={`new-q-${categoryId}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="How would you rate…?"
          disabled={busy}
          style={{ ...input, flex: 1, minWidth: 220 }}
        />
        <button type="submit" disabled={busy || !text.trim()} style={{ ...btnGhost, opacity: busy || !text.trim() ? 0.5 : 1 }}>
          {busy ? "Adding…" : "Add question"}
        </button>
      </div>
      <p style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>
        Scored questions with options and recommendations are authored via the JSON import for now.
      </p>
      {error && <p role="alert" style={{ color: colors.red, fontSize: 13, marginTop: 8 }}>{error}</p>}
    </form>
  );
}

const panel: React.CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.surfaceAlt}`,
  borderRadius: 10,
  padding: "18px 20px",
};
