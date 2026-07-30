"use client";

import React, { useState, useMemo, CSSProperties } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip
} from "recharts";
import { ChevronRight, ChevronLeft, Check, TrendingUp, AlertTriangle, Sparkles, Download, RotateCcw } from "lucide-react";

/* ----------------------------------------------------------------------
   RakeshProTech — Business Growth Audit Engine (prototype)
   Direct port of the interactive prototype: 8 categories, conditional
   logic, weighted scoring, and a generated consulting-style report.
   See RakeshProTechAuditArchitecture.md for how this scales to the full
   production system (DB-backed question bank, admin panel, exports).
------------------------------------------------------------------------- */

type Priority = "High" | "Medium" | "Low";

const priorityMeta: Record<Priority, { color: string; label: string }> = {
  High:   { color: "#C9432F", label: "High priority" },
  Medium: { color: "#C9A227", label: "Medium priority" },
  Low:    { color: "#3E7A5C", label: "Low priority" },
};

interface Rec {
  service: string;
  priority: Priority;
  timeline: string;
  budget: string;
}

interface ChoiceOption {
  label: string;
  points: number;
  rec?: Rec;
  gate?: string;
}

interface LowRec extends Rec {
  threshold: number;
}

interface QuestionBase {
  id: string;
  text: string;
  catId?: string;
  showIf?: (answers: AnswersMap) => boolean;
}

interface ChoiceQuestion extends QuestionBase {
  type: "choice";
  options: ChoiceOption[];
}

interface ScaleQuestion extends QuestionBase {
  type: "scale";
  lowRec?: LowRec;
}

type QuestionDef = ChoiceQuestion | ScaleQuestion;

interface AnswerValue {
  label?: string;
  points: number;
  rec?: Rec;
  gate?: string;
}

type AnswersMap = Record<string, AnswerValue>;

interface CategoryDef {
  id: string;
  name: string;
  weight: number;
  questions: QuestionDef[];
}

// ---- Question bank (representative slice) --------------------------------
const CATEGORIES: CategoryDef[] = [
  {
    id: "web",
    name: "Website & Digital Presence",
    weight: 1,
    questions: [
      {
        id: "web_exists",
        type: "choice",
        text: "Does your business currently have a website?",
        options: [
          { label: "No website", points: 0, rec: { service: "Professional Website Development", priority: "High", timeline: "3–5 weeks", budget: "₹40k – ₹1.5L" }, gate: "none" },
          { label: "In planning / building", points: 15, rec: { service: "Website Strategy & Build Acceleration", priority: "High", timeline: "2–4 weeks", budget: "₹25k – ₹80k" }, gate: "basic" },
          { label: "Yes, basic site", points: 40, gate: "full" },
          { label: "Yes, optimized & modern", points: 70, gate: "full" },
          { label: "Yes, SEO + lead-gen optimized", points: 100, gate: "full" },
        ],
      },
      {
        id: "web_speed",
        type: "scale",
        text: "How would you rate your site's speed & mobile experience?",
        showIf: (a) => a.web_exists?.gate !== "none",
        lowRec: { threshold: 60, service: "Performance & Mobile Optimization", priority: "Medium", timeline: "1–2 weeks", budget: "₹15k – ₹35k" },
      },
      {
        id: "web_security",
        type: "choice",
        text: "Do you have SSL, regular backups, and uptime monitoring in place?",
        showIf: (a) => a.web_exists?.gate !== "none",
        options: [
          { label: "No", points: 10, rec: { service: "Website Security & Backup Setup", priority: "High", timeline: "3–5 days", budget: "₹8k – ₹20k" } },
          { label: "Not sure", points: 30, rec: { service: "Security Audit", priority: "Medium", timeline: "1 week", budget: "₹8k – ₹15k" } },
          { label: "Yes", points: 100 },
        ],
      },
    ],
  },
  {
    id: "brand",
    name: "Brand Identity",
    weight: 1,
    questions: [
      {
        id: "brand_kit",
        type: "choice",
        text: "Do you have a consistent brand identity (logo, colors, fonts) across channels?",
        options: [
          { label: "No formal brand identity", points: 0, rec: { service: "Brand Identity Package", priority: "High", timeline: "2–3 weeks", budget: "₹20k – ₹60k" } },
          { label: "Basic logo only", points: 35, rec: { service: "Brand Guideline & Asset System", priority: "Medium", timeline: "1–2 weeks", budget: "₹15k – ₹30k" } },
          { label: "Full brand kit, used consistently", points: 100 },
        ],
      },
      {
        id: "brand_positioning",
        type: "scale",
        text: "How clearly can you state what makes you different from competitors?",
        lowRec: { threshold: 50, service: "Positioning & Messaging Workshop", priority: "Medium", timeline: "1 week", budget: "₹10k – ₹25k" },
      },
    ],
  },
  {
    id: "seo",
    name: "SEO & Local SEO",
    weight: 1,
    questions: [
      {
        id: "gbp",
        type: "choice",
        text: "Is your Google Business Profile claimed, verified, and actively updated?",
        options: [
          { label: "Don't have one", points: 0, rec: { service: "Google Business Profile Setup", priority: "High", timeline: "3–5 days", budget: "₹5k – ₹12k" } },
          { label: "Claimed but inactive", points: 30, rec: { service: "Local SEO Activation", priority: "High", timeline: "1–2 weeks", budget: "₹10k – ₹25k" } },
          { label: "Active & optimized", points: 100 },
        ],
      },
      {
        id: "seo_content",
        type: "choice",
        text: "Do you publish content targeting keywords your customers search for?",
        options: [
          { label: "Never", points: 0, rec: { service: "SEO Content Strategy", priority: "Medium", timeline: "Ongoing (monthly)", budget: "₹15k – ₹40k/mo" } },
          { label: "Occasionally", points: 45, rec: { service: "Content Calendar & SEO Optimization", priority: "Medium", timeline: "Ongoing", budget: "₹15k – ₹30k/mo" } },
          { label: "Consistently, with keyword strategy", points: 100 },
        ],
      },
    ],
  },
  {
    id: "leadgen",
    name: "Lead Generation & CRM",
    weight: 1.2,
    questions: [
      {
        id: "crm",
        type: "choice",
        text: "Do you use a CRM to track leads and follow-ups?",
        options: [
          { label: "No system — spreadsheets or memory", points: 0, rec: { service: "CRM Setup & Migration", priority: "High", timeline: "1–2 weeks", budget: "₹20k – ₹50k" } },
          { label: "Basic tool, underused", points: 35, rec: { service: "CRM Optimization & Automation", priority: "High", timeline: "1–2 weeks", budget: "₹15k – ₹35k" } },
          { label: "Yes, fully utilized", points: 100 },
        ],
      },
      {
        id: "lead_magnets",
        type: "choice",
        text: "Do you have lead magnets or landing pages designed to capture leads?",
        options: [
          { label: "None", points: 0, rec: { service: "Lead Magnet & Landing Page Design", priority: "High", timeline: "2–3 weeks", budget: "₹20k – ₹50k" } },
          { label: "One or two, rarely updated", points: 40, rec: { service: "Landing Page Optimization", priority: "Medium", timeline: "1–2 weeks", budget: "₹10k – ₹25k" } },
          { label: "Several, actively tested", points: 100 },
        ],
      },
    ],
  },
  {
    id: "marketing_auto",
    name: "Marketing Automation & Email",
    weight: 1,
    questions: [
      {
        id: "email_marketing",
        type: "choice",
        text: "Do you run email or WhatsApp marketing campaigns?",
        options: [
          { label: "No", points: 0, rec: { service: "Email + WhatsApp Marketing Setup", priority: "Medium", timeline: "1–2 weeks", budget: "₹12k – ₹30k" } },
          { label: "Occasionally, manually", points: 40, rec: { service: "Marketing Automation Workflows", priority: "Medium", timeline: "2 weeks", budget: "₹15k – ₹35k" } },
          { label: "Automated, segmented campaigns", points: 100 },
        ],
      },
    ],
  },
  {
    id: "sales",
    name: "Sales Process",
    weight: 1,
    questions: [
      {
        id: "sales_process",
        type: "choice",
        text: "Do you have a documented sales process / SOP for converting leads?",
        options: [
          { label: "No, it's improvised", points: 0, rec: { service: "Sales SOP & Playbook Design", priority: "High", timeline: "2 weeks", budget: "₹15k – ₹35k" } },
          { label: "Loosely defined", points: 45, rec: { service: "Sales Process Optimization", priority: "Medium", timeline: "1–2 weeks", budget: "₹10k – ₹25k" } },
          { label: "Documented & consistently followed", points: 100 },
        ],
      },
    ],
  },
  {
    id: "analytics",
    name: "Analytics & Tracking",
    weight: 0.9,
    questions: [
      {
        id: "tracking",
        type: "choice",
        text: "Do you track website & ad performance with analytics tools (GA4, Meta Pixel, etc.)?",
        options: [
          { label: "No tracking at all", points: 0, rec: { service: "Analytics & Conversion Tracking Setup", priority: "High", timeline: "3–5 days", budget: "₹10k – ₹20k" } },
          { label: "Basic tracking, rarely reviewed", points: 40, rec: { service: "Analytics Dashboard & Reporting", priority: "Medium", timeline: "1 week", budget: "₹10k – ₹20k" } },
          { label: "Full tracking, reviewed regularly", points: 100 },
        ],
      },
    ],
  },
  {
    id: "ai",
    name: "AI Readiness & Automation",
    weight: 1,
    questions: [
      {
        id: "ai_readiness",
        type: "choice",
        text: "Are you using AI or automation for customer support, content, or operations?",
        options: [
          { label: "Not at all", points: 0, rec: { service: "AI Automation Roadmap", priority: "Medium", timeline: "2–4 weeks", budget: "₹20k – ₹60k" } },
          { label: "Experimenting a little", points: 40, rec: { service: "AI Workflow Implementation", priority: "Medium", timeline: "2–3 weeks", budget: "₹20k – ₹50k" } },
          { label: "Actively using AI across operations", points: 100 },
        ],
      },
    ],
  },
];

const ALL_QUESTIONS: QuestionDef[] = CATEGORIES.flatMap(c => c.questions.map(q => ({ ...q, catId: c.id })));

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
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
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

export default function AuditApp() {
  const [stage, setStage] = useState<Stage>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [businessName, setBusinessName] = useState("");

  const visibleQuestions = useMemo(
    () => ALL_QUESTIONS.filter(q => !q.showIf || q.showIf(answers)),
    [answers]
  );
  const current = visibleQuestions[step];
  const totalSteps = visibleQuestions.length;
  const progress = totalSteps ? Math.round((step / totalSteps) * 100) : 0;

  function answer(qid: string, value: AnswerValue) {
    setAnswers(prev => ({ ...prev, [qid]: value }));
  }

  function next() {
    if (step + 1 >= visibleQuestions.length) {
      setStage("report");
    } else {
      setStep(step + 1);
    }
  }
  function back() {
    if (step > 0) setStep(step - 1);
    else setStage("intro");
  }

  // ---- Scoring -------------------------------------------------------
  const report = useMemo(() => {
    const catScores = CATEGORIES.map(cat => {
      const qs = cat.questions.filter(q => !q.showIf || q.showIf(answers));
      const pts = qs
        .map(q => {
          const a = answers[q.id];
          if (!a) return null;
          return a.points;
        })
        .filter((p): p is number => p !== null);
      const score = pts.length ? pts.reduce((s, p) => s + p, 0) / pts.length : null;
      return { id: cat.id, name: cat.name, weight: cat.weight, score };
    });

    const scored = catScores.filter((c): c is { id: string; name: string; weight: number; score: number } => c.score !== null);
    const overall = scored.length
      ? scored.reduce((s, c) => s + c.score * c.weight, 0) / scored.reduce((s, c) => s + c.weight, 0)
      : 0;

    const strengths = scored.filter(c => c.score >= 70).sort((a, b) => b.score - a.score);
    const weaknesses = scored.filter(c => c.score < 50).sort((a, b) => a.score - b.score);

    const recommendations: Rec[] = [];
    ALL_QUESTIONS.forEach(q => {
      const a = answers[q.id];
      if (!a) return;
      if (q.type === "choice" && a.rec) recommendations.push(a.rec);
      if (q.type === "scale" && q.lowRec && a.points < q.lowRec.threshold) {
        recommendations.push({ service: q.lowRec.service, priority: q.lowRec.priority, timeline: q.lowRec.timeline, budget: q.lowRec.budget });
      }
    });
    // de-dupe by service name, keep highest priority
    const order: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
    const map = new Map<string, Rec>();
    recommendations.forEach(r => {
      const existing = map.get(r.service);
      if (!existing || order[r.priority] < order[existing.priority]) map.set(r.service, r);
    });
    const recs = Array.from(map.values()).sort((a, b) => order[a.priority] - order[b.priority]);

    return { catScores: scored, overall, strengths, weaknesses, recs };
  }, [answers]);

  const radarData = report.catScores.map(c => ({ subject: c.name.split(" ").slice(0, 2).join(" "), score: Math.round(c.score), full: 100 }));

  // ================= INTRO =================
  if (stage === "intro") {
    return (
      <Shell>
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto", padding: "64px 24px" }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, letterSpacing: 3, color: "#C9A227", marginBottom: 18 }}>
            RAKESHPROTECH &nbsp;·&nbsp; BUSINESS GROWTH AUDIT
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 42, lineHeight: 1.15, color: "#F2F4F3", margin: "0 0 20px" }}>
            Discover exactly where your business stands — and what to fix first.
          </h1>
          <p style={{ color: "#9AA3AF", fontSize: 16, lineHeight: 1.6, marginBottom: 36 }}>
            An interactive, consultant-grade audit across your website, brand, SEO, sales, marketing,
            and automation. Takes about 6 minutes. You&apos;ll get a Digital Maturity Score and a
            prioritized roadmap at the end.
          </p>
          <input
            placeholder="Your business name"
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            style={{
              width: "100%", padding: "14px 18px", borderRadius: 10, border: "1px solid #2A313B",
              background: "#151A20", color: "#F2F4F3", fontSize: 15, marginBottom: 20, outline: "none"
            }}
          />
          <button onClick={() => setStage("audit")} style={btnPrimary}>
            Begin the audit <ChevronRight size={18} style={{ verticalAlign: "-3px" }} />
          </button>
        </div>
      </Shell>
    );
  }

  // ================= AUDIT =================
  if (stage === "audit") {
    if (!current) {
      setStage("report");
      return null;
    }
    return (
      <Shell>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ color: "#8A93A0", fontSize: 13, fontFamily: "Inter, sans-serif" }}>
              {CATEGORIES.find(c => c.id === current.catId)?.name}
            </span>
            <span style={{ color: "#8A93A0", fontSize: 13 }}>{step + 1} / {totalSteps}</span>
          </div>
          <div style={{ height: 4, background: "#20262E", borderRadius: 4, marginBottom: 40, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "#C9A227", transition: "width .4s ease" }} />
          </div>

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, color: "#F2F4F3", marginBottom: 28, lineHeight: 1.35 }}>
            {current.text}
          </h2>

          {current.type === "choice" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {current.options.map(opt => {
                const selected = answers[current.id]?.label === opt.label;
                return (
                  <button
                    key={opt.label}
                    onClick={() => { answer(current.id, opt); }}
                    style={{
                      textAlign: "left", padding: "16px 18px", borderRadius: 10,
                      border: `1px solid ${selected ? "#C9A227" : "#2A313B"}`,
                      background: selected ? "rgba(201,162,39,0.08)" : "#151A20",
                      color: "#F2F4F3", fontSize: 15, cursor: "pointer",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}
                  >
                    {opt.label}
                    {selected && <Check size={18} color="#C9A227" />}
                  </button>
                );
              })}
            </div>
          )}

          {current.type === "scale" && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
                  const selected = answers[current.id]?.points === n * 10;
                  return (
                    <button
                      key={n}
                      onClick={() => answer(current.id, { points: n * 10 })}
                      style={{
                        flex: 1, padding: "12px 0", borderRadius: 8,
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

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 44 }}>
            <button onClick={back} style={btnGhost}><ChevronLeft size={16} style={{ verticalAlign: "-2px" }} /> Back</button>
            <button onClick={next} disabled={!answers[current.id]} style={{ ...btnPrimary, opacity: answers[current.id] ? 1 : 0.4, padding: "12px 26px" }}>
              {step + 1 === totalSteps ? "See my report" : "Next"} <ChevronRight size={16} style={{ verticalAlign: "-2px" }} />
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ================= REPORT =================
  return (
    <Shell>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, letterSpacing: 3, color: "#C9A227", marginBottom: 10 }}>
          GROWTH AUDIT REPORT{businessName ? ` — ${businessName.toUpperCase()}` : ""}
        </div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, color: "#F2F4F3", marginBottom: 36 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 40 }}>
          {report.catScores.map(c => (
            <div key={c.id} style={{ background: "#151A20", border: "1px solid #20262E", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
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
              {report.strengths.map(s => s.name).join(", ")} — {report.strengths.length > 1 ? "these are" : "this is"} already ahead of most businesses we audit. Keep them as-is for now.
            </p>
          </>
        )}

        {report.weaknesses.length > 0 && (
          <>
            <SectionTitle icon={<AlertTriangle size={16} color="#C9432F" />}>Biggest gaps</SectionTitle>
            <p style={{ color: "#9AA3AF", marginBottom: 32, lineHeight: 1.6 }}>
              {report.weaknesses.map(s => s.name).join(", ")} {report.weaknesses.length > 1 ? "are" : "is"} where you&apos;re most exposed — and where the fastest wins usually live.
            </p>
          </>
        )}

        <SectionTitle icon={<TrendingUp size={16} color="#C9A227" />}>Recommended next steps</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 44 }}>
          {report.recs.map((r, i) => (
            <div key={i} style={{ background: "#151A20", border: "1px solid #20262E", borderRadius: 10, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ color: "#F2F4F3", fontSize: 15, marginBottom: 4 }}>{r.service}</div>
                <div style={{ color: "#8A93A0", fontSize: 12.5 }}>Timeline: {r.timeline} &nbsp;·&nbsp; Budget: {r.budget}</div>
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
          {report.recs.length === 0 && (
            <p style={{ color: "#9AA3AF" }}>No urgent gaps found — strong foundation across the board.</p>
          )}
        </div>

        <SectionTitle icon={<Sparkles size={16} color="#C9A227" />}>90-day roadmap</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 44 }}>
          {["Days 1–30 · Fix critical gaps", "Days 31–60 · Build growth systems", "Days 61–90 · Scale & automate"].map((phase, i) => {
            const bucket = report.recs.filter((_, idx) => idx % 3 === i).slice(0, 3);
            return (
              <div key={i} style={{ display: "flex", gap: 18, paddingBottom: 22 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#C9A227", marginTop: 4 }} />
                  {i < 2 && <div style={{ width: 1, flex: 1, background: "#2A313B", marginTop: 4 }} />}
                </div>
                <div>
                  <div style={{ color: "#F2F4F3", fontWeight: 600, marginBottom: 6 }}>{phase}</div>
                  <div style={{ color: "#8A93A0", fontSize: 13.5 }}>
                    {bucket.length ? bucket.map(b => b.service).join(", ") : "Maintain & monitor current performance"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button style={btnPrimary}><Download size={16} style={{ verticalAlign: "-2px" }} /> Download full report (PDF)</button>
          <button onClick={() => { setStage("intro"); setStep(0); setAnswers({}); }} style={btnGhost}>
            <RotateCcw size={14} style={{ verticalAlign: "-2px" }} /> Restart audit
          </button>
        </div>
      </div>
    </Shell>
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
      `}</style>
      {children}
    </div>
  );
}

const btnPrimary: CSSProperties = {
  background: "#C9A227", color: "#151A20", border: "none", padding: "14px 28px",
  borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif",
};
const btnGhost: CSSProperties = {
  background: "transparent", color: "#9AA3AF", border: "1px solid #2A313B", padding: "12px 20px",
  borderRadius: 10, fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif",
};
