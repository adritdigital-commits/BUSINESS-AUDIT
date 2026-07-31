# Roadmap

Working document. Updated before each task is started and after it lands.
Priorities are defined in `PRIORITY.md`; status of the codebase in
`DEVELOPMENT_STATUS.md`.

---

## Now — Version 1.0

Sequential. A feature is not started until the previous one's tests pass.

| # | Feature | Status |
|---|---|---|
| 1.1 | Test infrastructure | **Done** — Vitest + Testing Library, 54 unit tests, wired into CI |
| 1.2 | Frontend↔backend integration | **Next** |
| 1.3 | Auth UI — login, registration, forgot password | Not started |
| 1.4 | Client dashboard | Not started |
| 1.5 | Rate limiting + abuse protection | Not started |
| 1.6 | Security headers + CSRF | Not started |
| 1.7 | Email delivery | Not started |
| 1.8 | Assessment history + resume | Not started |
| 1.9 | Admin dashboard shell + role management | Not started |
| 1.10 | Question + category management UI | Not started |
| 1.11 | PDF report generator | Not started |
| 1.12 | Proposal generator UI | Not started |
| 1.13 | Business landing page | Not started |
| 1.14 | Client + company profile | Not started |
| 1.15 | Loading, error, and empty states | Not started |
| 1.16 | Mobile responsiveness + accessibility | Not started |
| 1.17 | Fix Bugs 1–5 | Not started |
| 1.18 | Retire duplicate scoring + question bank | Not started |

## Next — Version 1.1

Priority 2 items from `PRIORITY.md`: staff dashboard, CRM pipeline, lead
management, Excel export, analytics, audit logs, notification centre,
settings, conditional-logic builder, scoring-rules editor, service management,
pricing calculator, Calendly, question-bank versioning, soft deletes,
structured logging, performance work.

## Later — Version 2.0

Priority 4: OpenAI integration and the AI analyzer suite, RAG knowledge base,
chat assistant, multi-tenancy, white-label, agency portal.

---

## Open decisions

**Multi-tenancy boundary.** Reserving a tenant column across the nine existing
tables now is far cheaper than retrofitting it post-launch. Needs a decision
before 1.0 ships even though the feature is P4.

**SCALE question recommendations.** The production engine can only trigger
recommendations from `Option.recommendedService`, so SCALE questions cannot
produce advice. Either add a threshold-rule field to `Question` or convert the
two affected questions to `CHOICE`. Blocks full parity with the prototype.

**Question-bank versioning.** Completed assessments snapshot `reportJson`, but
their `answersJson` keys can point at questions later edited or deleted.
Proper fix is an append-only bank or a `QuestionVersion` table.
