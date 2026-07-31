"use client";

import React, { useCallback, useEffect, useMemo, useState, CSSProperties } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip
} from "recharts";
import { ChevronRight, ChevronLeft, Check, TrendingUp, AlertTriangle, Sparkles, Download, RotateCcw, Loader2 } from "lucide-react";
import type { Priority } from "@prisma/client";
import { ApiError, auditApi, type ApiCategory, type ApiQuestion } from "@/lib/apiClient";
import { formatBudgetRange } from "@/lib/format";
import type { Report } from "@/lib/report";
import { indexQuestions, isVisible, type AnswerEntry, type AnswersMap } from "@/lib/scoring";

/* ----------------------------------------------------------------------
   RakeshProTech — Business Growth Audit
   The question bank, scoring, and report all come from the API. Answers
   autosave to the database on every selection, so progress survives a
   refresh and every completed audit becomes a captured lead.
------------------------------------------------------------------------- */

const priorityMeta: Record<Priority, { color: string; label: string }> = {
  HIGH:   { color: "#C9432F", label: "High priority" },
  MEDIUM: { color: "#C9A227", label: "Medium priority" },
  LOW:    { color: "#3E7A5C", label: "Low priority" },
};

function scoreColor(score: number) {
  if (score >= 70) return "#3E7A5C";
  if (score >= 40) return "#C9A227";
  return "#C9432F";
}

function Gauge({ score, size = 180 }: { score: number; size?: number }) {
  const r = (size - 20) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = scoreColor(score);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Digital maturity score: ${Math.round(score)} out of 100`}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#20262E" strokeWidth={14} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={14}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text x="50%" y="46%" textAnchor="middle" fontSize={size * 0.24} fontWeight={700} fill="#F2F4F3" fontFamily="'Fraunces', serif">
        {Math.round(score)}
      </text>
      <text x="50%" y="62%" textAnchor="middle" fontSize={size * 0.075} letterSpacing={2} fill="#8A93A0" fontFamily="Inter, sans-serif">
        MATURITY SCORE
      </text>
    </svg>
  );
}

type Stage = "intro" | "audit" | "report";
type SaveState = "idle" | "saving" | "saved" | "error";

export interface AuditAppProps {
  /** When set, the component resumes this assessment instead of showing the intro. */
  resumeAssessmentId?: string;
  /** Resume token, for anonymous visitors returning via an emailed link. */
  resumeToken?: string | null;
  /** Business name to show while resuming, so the header isn't blank. */
  resumeBusinessName?: string | null;
}

export default function AuditApp({
  resumeAssessmentId,
  resumeToken: initialResumeToken = null,
  resumeBusinessName = null,
}: AuditAppProps = {}) {
  const isResuming = Boolean(resumeAssessmentId);
  const [stage, setStage] = useState<Stage>(isResuming ? "audit" : "intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [businessName, setBusinessName] = useState(resumeBusinessName ?? "");

  const [categories, setCategories] = useState<ApiCategory[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [assessmentId, setAssessmentId] = useState<string | null>(resumeAssessmentId ?? null);
  const [resumeToken, setResumeToken] = useState<string | null>(initialResumeToken);
  const [hydrated, setHydrated] = useState(!isResuming);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [report, setReport] = useState<Report | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  // --- Load the question bank -------------------------------------------
  useEffect(() => {
    const controller = new AbortController();
    setLoadError(null);

    auditApi
      .getCategories(controller.signal)
      .then(setCategories)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof ApiError ? error.userMessage : "Failed to load the audit.");
      });

    return () => controller.abort();
  }, [reloadKey]);

  // --- Hydrate a resumed assessment --------------------------------------
  useEffect(() => {
    if (!resumeAssessmentId) return;
    const controller = new AbortController();

    auditApi
      .getAssessment(resumeAssessmentId, initialResumeToken, controller.signal)
      .then((assessment) => {
        if (controller.signal.aborted) return;
        setAnswers(assessment.answersJson ?? {});
        setHydrated(true);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResumeError(
          error instanceof ApiError ? error.userMessage : "Couldn't load your saved answers."
        );
        setHydrated(true);
      });

    return () => controller.abort();
  }, [resumeAssessmentId, initialResumeToken]);

  // --- Visible questions, gated by the shared scoring engine -------------
  const allQuestions = useMemo<ApiQuestion[]>(
    () => (categories ?? []).flatMap((c) => c.questions),
    [categories]
  );
  const questionsById = useMemo(() => indexQuestions(categories ?? []), [categories]);
  const visibleQuestions = useMemo(
    () => allQuestions.filter((q) => isVisible(q, answers, questionsById)),
    [allQuestions, answers, questionsById]
  );

  // On resume, land on the first unanswered question rather than the start.
  const [jumped, setJumped] = useState(!isResuming);
  useEffect(() => {
    if (jumped || !hydrated || !categories) return;
    const firstUnanswered = visibleQuestions.findIndex((q) => !answers[q.id]);
    setStep(firstUnanswered === -1 ? Math.max(visibleQuestions.length - 1, 0) : firstUnanswered);
    setJumped(true);
  }, [jumped, hydrated, categories, visibleQuestions, answers]);

  const current = visibleQuestions[step];
  const totalSteps = visibleQuestions.length;
  const progress = totalSteps ? Math.round((step / totalSteps) * 100) : 0;
  const currentCategory = categories?.find((c) => c.id === current?.categoryId);

  // The audit is finished when the last visible question is answered. Because
  // conditional questions can appear mid-flow, this is recomputed rather than
  // compared against a fixed total.
  const isLastStep = step + 1 >= totalSteps;

  async function beginAudit() {
    if (!businessName.trim()) return;
    setStarting(true);
    setStartError(null);
    try {
      const assessment = await auditApi.startAssessment({ businessName: businessName.trim() });
      setAssessmentId(assessment.id);
      setResumeToken(assessment.resumeToken);
      setStage("audit");
    } catch (error) {
      setStartError(error instanceof ApiError ? error.userMessage : "Couldn't start the audit.");
    } finally {
      setStarting(false);
    }
  }

  const saveAnswer = useCallback(
    async (questionId: string, entry: AnswerEntry) => {
      if (!assessmentId) return;
      setSaveState("saving");
      try {
        await auditApi.saveAnswer(assessmentId, resumeToken, questionId, entry);
        setSaveState("saved");
      } catch {
        // The answer stays in local state, so the user can keep going and
        // the next save reconciles. Surfaced, not swallowed.
        setSaveState("error");
      }
    },
    [assessmentId, resumeToken]
  );

  function answer(questionId: string, entry: AnswerEntry) {
    setAnswers((prev) => ({ ...prev, [questionId]: entry }));
    void saveAnswer(questionId, entry);
  }

  async function next() {
    if (!isLastStep) {
      setStep(step + 1);
      return;
    }
    if (!assessmentId) return;

    setFinishing(true);
    setFinishError(null);
    try {
      const generated = await auditApi.complete(assessmentId, resumeToken);
      setReport(generated);
      setStage("report");
    } catch (error) {
      setFinishError(
        error instanceof ApiError ? error.userMessage : "Couldn't generate your report."
      );
    } finally {
      setFinishing(false);
    }
  }

  function back() {
    if (step > 0) setStep(step - 1);
    else setStage("intro");
  }

  function restart() {
    setStage("intro");
    setStep(0);
    setAnswers({});
    setAssessmentId(null);
    setResumeToken(null);
    setReport(null);
    setSaveState("idle");
    setFinishError(null);
  }

  // ================= INTRO =================
  if (stage === "intro") {
    return (
      <Shell>
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto", padding: "clamp(32px, 8vw, 64px) 24px" }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, letterSpacing: 3, color: "#C9A227", marginBottom: 18 }}>
            RAKESHPROTECH &nbsp;·&nbsp; BUSINESS GROWTH AUDIT
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(28px, 6vw, 42px)", lineHeight: 1.15, color: "#F2F4F3", margin: "0 0 20px" }}>
            Discover exactly where your business stands — and what to fix first.
          </h1>
          <p style={{ color: "#9AA3AF", fontSize: 16, lineHeight: 1.6, marginBottom: 36 }}>
            An interactive, consultant-grade audit across your website, brand, SEO, sales, marketing,
            and automation. Takes about 6 minutes. You&apos;ll get a Digital Maturity Score and a
            prioritized roadmap at the end.
          </p>

          {loadError ? (
            <ErrorPanel message={loadError} onRetry={() => setReloadKey((k) => k + 1)} />
          ) : !categories ? (
            <LoadingPanel label="Loading the audit…" />
          ) : categories.length === 0 ? (
            <EmptyPanel
              title="The audit isn't ready yet"
              body="No questions have been published. Please check back shortly."
            />
          ) : (
            <>
              <label htmlFor="business-name" style={srOnly}>Your business name</label>
              <input
                id="business-name"
                placeholder="Your business name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void beginAudit(); }}
                disabled={starting}
                style={{
                  width: "100%", padding: "14px 18px", borderRadius: 10, border: "1px solid #2A313B",
                  background: "#151A20", color: "#F2F4F3", fontSize: 15, marginBottom: 20, outline: "none"
                }}
              />
              <button
                onClick={() => void beginAudit()}
                disabled={starting || !businessName.trim()}
                style={{ ...btnPrimary, opacity: starting || !businessName.trim() ? 0.5 : 1 }}
              >
                {starting ? (
                  <>Starting… <Loader2 size={16} style={{ verticalAlign: "-3px" }} className="spin" /></>
                ) : (
                  <>Begin the audit <ChevronRight size={18} style={{ verticalAlign: "-3px" }} /></>
                )}
              </button>
              {startError && (
                <p role="alert" style={{ color: "#C9432F", marginTop: 16, fontSize: 14 }}>{startError}</p>
              )}
            </>
          )}
        </div>
      </Shell>
    );
  }

  // ================= AUDIT =================
  if (stage === "audit") {
    if (resumeError) {
      return (
        <Shell>
          <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px" }}>
            <ErrorPanel message={resumeError} onRetry={() => window.location.reload()} />
          </div>
        </Shell>
      );
    }

    if (!current) {
      return (
        <Shell>
          <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px" }}>
            <LoadingPanel
              label={!hydrated || !categories ? "Loading your audit…" : "Preparing your report…"}
            />
          </div>
        </Shell>
      );
    }

    return (
      <Shell>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "clamp(24px, 6vw, 48px) 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 12 }}>
            <span style={{ color: "#8A93A0", fontSize: 13, fontFamily: "Inter, sans-serif" }}>
              {currentCategory?.name}
            </span>
            <span style={{ color: "#8A93A0", fontSize: 13, whiteSpace: "nowrap" }}>{step + 1} / {totalSteps}</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-label="Audit progress"
            style={{ height: 4, background: "#20262E", borderRadius: 4, marginBottom: 40, overflow: "hidden" }}
          >
            <div style={{ height: "100%", width: `${progress}%`, background: "#C9A227", transition: "width .4s ease" }} />
          </div>

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(20px, 4.5vw, 26px)", color: "#F2F4F3", marginBottom: 28, lineHeight: 1.35 }}>
            {current.text}
          </h2>

          {current.type !== "SCALE" && (
            <div role="radiogroup" aria-label={current.text} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {current.options.map((opt) => {
                const selected = answers[current.id]?.optionId === opt.id;
                return (
                  <button
                    key={opt.id}
                    role="radio"
                    aria-checked={selected}
                    onClick={() => answer(current.id, { optionId: opt.id })}
                    style={{
                      textAlign: "left", padding: "16px 18px", borderRadius: 10,
                      border: `1px solid ${selected ? "#C9A227" : "#2A313B"}`,
                      background: selected ? "rgba(201,162,39,0.08)" : "#151A20",
                      color: "#F2F4F3", fontSize: 15, cursor: "pointer",
                      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                    }}
                  >
                    {opt.label}
                    {selected && <Check size={18} color="#C9A227" aria-hidden />}
                  </button>
                );
              })}
            </div>
          )}

          {current.type === "SCALE" && (
            <div role="radiogroup" aria-label={current.text}>
              <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                {scaleValues(current).map((n) => {
                  const selected = answers[current.id]?.value === n;
                  return (
                    <button
                      key={n}
                      role="radio"
                      aria-checked={selected}
                      aria-label={`${n}`}
                      onClick={() => answer(current.id, { value: n })}
                      style={{
                        flex: "1 0 40px", minWidth: 40, padding: "12px 0", borderRadius: 8,
                        border: `1px solid ${selected ? "#C9A227" : "#2A313B"}`,
                        background: selected ? "#C9A227" : "#151A20",
                        color: selected ? "#151A20" : "#8A93A0", fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8A93A0" }}>
                <span>Needs work</span><span>Excellent</span>
              </div>
            </div>
          )}

          <div aria-live="polite" style={{ minHeight: 20, marginTop: 20, fontSize: 12.5, color: saveState === "error" ? "#C9432F" : "#8A93A0" }}>
            {saveState === "saving" && "Saving…"}
            {saveState === "saved" && "Progress saved"}
            {saveState === "error" && "Couldn't save that answer — we'll retry on the next one."}
          </div>

          {finishError && (
            <p role="alert" style={{ color: "#C9432F", fontSize: 14, marginTop: 8 }}>{finishError}</p>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, gap: 12, flexWrap: "wrap" }}>
            <button onClick={back} style={btnGhost}><ChevronLeft size={16} style={{ verticalAlign: "-2px" }} /> Back</button>
            <button
              onClick={() => void next()}
              disabled={!answers[current.id] || finishing}
              style={{ ...btnPrimary, opacity: answers[current.id] && !finishing ? 1 : 0.4, padding: "12px 26px" }}
            >
              {finishing ? "Generating…" : isLastStep ? "See my report" : "Next"}
              {!finishing && <ChevronRight size={16} style={{ verticalAlign: "-2px" }} />}
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ================= REPORT =================
  if (!report) {
    return (
      <Shell>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px" }}>
          <LoadingPanel label="Loading your report…" />
        </div>
      </Shell>
    );
  }

  const radarData = report.categoryScores.map((c) => ({
    subject: c.name.split(" ").slice(0, 2).join(" "),
    score: Math.round(c.score),
    full: 100,
  }));

  return (
    <Shell>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "clamp(24px, 6vw, 48px) 24px 80px" }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, letterSpacing: 3, color: "#C9A227", marginBottom: 10 }}>
          GROWTH AUDIT REPORT{businessName ? ` — ${businessName.toUpperCase()}` : ""}
        </div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(24px, 5vw, 32px)", color: "#F2F4F3", marginBottom: 36 }}>
          Here&apos;s where things stand.
        </h1>

        <div style={{ display: "flex", gap: 40, flexWrap: "wrap", alignItems: "center", marginBottom: 48 }}>
          <Gauge score={report.overall} />
          <div style={{ flex: 1, minWidth: 260, height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="#2A313B" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#8A93A0", fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="score" stroke="#C9A227" fill="#C9A227" fillOpacity={0.35} />
                <Tooltip contentStyle={{ background: "#151A20", border: "1px solid #2A313B", borderRadius: 8 }} labelStyle={{ color: "#F2F4F3" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <SectionTitle icon={<TrendingUp size={16} color="#3E7A5C" />}>Category scores</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 40 }}>
          {report.categoryScores.map((c) => (
            <div key={c.categoryId} style={{ background: "#151A20", border: "1px solid #20262E", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
                <span style={{ color: "#F2F4F3", fontSize: 14 }}>{c.name}</span>
                <span style={{ color: scoreColor(c.score), fontWeight: 700 }}>{Math.round(c.score)}</span>
              </div>
              <div style={{ height: 6, background: "#20262E", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${c.score}%`, background: scoreColor(c.score) }} />
              </div>
            </div>
          ))}
        </div>

        {report.strengths.length > 0 && (
          <>
            <SectionTitle icon={<Sparkles size={16} color="#3E7A5C" />}>Strengths</SectionTitle>
            <p style={{ color: "#9AA3AF", marginBottom: 32, lineHeight: 1.6 }}>
              {report.strengths.map((s) => s.name).join(", ")} — {report.strengths.length > 1 ? "these are" : "this is"} already ahead of most businesses we audit. Keep them as-is for now.
            </p>
          </>
        )}

        {report.weaknesses.length > 0 && (
          <>
            <SectionTitle icon={<AlertTriangle size={16} color="#C9432F" />}>Biggest gaps</SectionTitle>
            <p style={{ color: "#9AA3AF", marginBottom: 32, lineHeight: 1.6 }}>
              {report.weaknesses.map((s) => s.name).join(", ")} {report.weaknesses.length > 1 ? "are" : "is"} where you&apos;re most exposed — and where the fastest wins usually live.
            </p>
          </>
        )}

        <SectionTitle icon={<TrendingUp size={16} color="#C9A227" />}>Recommended next steps</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 44 }}>
          {report.recommendations.map((r) => (
            <div key={r.serviceId} style={{ background: "#151A20", border: "1px solid #20262E", borderRadius: 10, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ color: "#F2F4F3", fontSize: 15, marginBottom: 4 }}>{r.service}</div>
                <div style={{ color: "#8A93A0", fontSize: 12.5 }}>
                  {r.timeToFix ? <>Timeline: {r.timeToFix} &nbsp;·&nbsp; </> : null}
                  Budget: {formatBudgetRange(r.costRangeMin ?? 0, r.costRangeMax ?? 0)}
                </div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: 0.5, padding: "5px 10px", borderRadius: 20,
                color: priorityMeta[r.priority].color, border: `1px solid ${priorityMeta[r.priority].color}55`,
                background: `${priorityMeta[r.priority].color}14`
              }}>
                {priorityMeta[r.priority].label.toUpperCase()}
              </span>
            </div>
          ))}
          {report.recommendations.length === 0 && (
            <p style={{ color: "#9AA3AF" }}>No urgent gaps found — strong foundation across the board.</p>
          )}
        </div>

        {report.budget.max > 0 && (
          <p style={{ color: "#8A93A0", fontSize: 13.5, marginTop: -32, marginBottom: 44 }}>
            Estimated investment across all recommendations:{" "}
            <span style={{ color: "#C9A227", fontWeight: 600 }}>
              {formatBudgetRange(report.budget.min, report.budget.max)}
            </span>
          </p>
        )}

        <SectionTitle icon={<Sparkles size={16} color="#C9A227" />}>90-day roadmap</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 44 }}>
          {([
            ["Days 1–30 · Fix critical gaps", report.roadmap.days1to30],
            ["Days 31–60 · Build growth systems", report.roadmap.days31to60],
            ["Days 61–90 · Scale & automate", report.roadmap.days61to90],
          ] as const).map(([phase, items], i) => (
            <div key={phase} style={{ display: "flex", gap: 18, paddingBottom: 22 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#C9A227", marginTop: 4 }} />
                {i < 2 && <div style={{ width: 1, flex: 1, background: "#2A313B", marginTop: 4 }} />}
              </div>
              <div>
                <div style={{ color: "#F2F4F3", fontWeight: 600, marginBottom: 6 }}>{phase}</div>
                <div style={{ color: "#8A93A0", fontSize: 13.5 }}>
                  {items.length ? items.map((b) => b.service).join(", ") : "Maintain & monitor current performance"}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button style={{ ...btnPrimary, opacity: 0.5, cursor: "not-allowed" }} disabled title="PDF export is coming soon">
            <Download size={16} style={{ verticalAlign: "-2px" }} /> Download full report (PDF)
          </button>
          <button onClick={restart} style={btnGhost}>
            <RotateCcw size={14} style={{ verticalAlign: "-2px" }} /> Restart audit
          </button>
        </div>
      </div>
    </Shell>
  );
}

/** 1..10 by default, or the question's configured range. */
function scaleValues(question: ApiQuestion): number[] {
  const min = question.scaleMin ?? 1;
  const max = question.scaleMax ?? 10;
  if (max <= min) return [min];
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#8A93A0", padding: "32px 0" }}>
      <Loader2 size={18} className="spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" style={{ background: "#151A20", border: "1px solid #2A313B", borderRadius: 10, padding: "24px 20px" }}>
      <p style={{ color: "#F2F4F3", marginBottom: 16 }}>{message}</p>
      <button onClick={onRetry} style={btnGhost}>Try again</button>
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ background: "#151A20", border: "1px solid #2A313B", borderRadius: 10, padding: "24px 20px" }}>
      <p style={{ color: "#F2F4F3", marginBottom: 8, fontWeight: 600 }}>{title}</p>
      <p style={{ color: "#8A93A0", fontSize: 14, margin: 0 }}>{body}</p>
    </div>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      {icon}
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, color: "#F2F4F3", margin: 0 }}>{children}</h3>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100%", background: "#0B0F14",
      fontFamily: "Inter, -apple-system, sans-serif"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .spin { animation: none; }
          * { transition: none !important; }
        }
      `}</style>
      {children}
    </div>
  );
}

const srOnly: CSSProperties = {
  position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
  overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0,
};

const btnPrimary: CSSProperties = {
  background: "#C9A227", color: "#151A20", border: "none", padding: "14px 28px",
  borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif",
};
const btnGhost: CSSProperties = {
  background: "transparent", color: "#9AA3AF", border: "1px solid #2A313B", padding: "12px 20px",
  borderRadius: 10, fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif",
};
