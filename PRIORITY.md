# Priority

Every missing feature, ranked. Derived from `DEVELOPMENT_STATUS.md` at commit
`7486abb`.

**P1** — Required before launch
**P2** — Should have
**P3** — Nice to have
**P4** — Future roadmap

Ordering within P1 is a dependency chain, not a preference list: each item
unblocks the ones beneath it.

---

## Priority 1 — Required before launch

| # | Feature | Why it blocks launch | Depends on |
|---|---|---|---|
| **1.1** | **Test infrastructure** | The stated development standard requires unit + integration tests for every feature. No runner exists, so no feature can meet the definition of done. Blocks everything. | — |
| **1.2** | **Frontend↔backend integration** | Nothing submitted is persisted. No leads captured, no assessments stored. The product does not commercially function without this. | 1.1 |
| **1.3** | **Auth UI — login, registration, forgot password** | Middleware already redirects to `/login`, which 404s. No user can ever authenticate. | 1.1 |
| **1.4** | **Client dashboard** | Middleware redirects `/admin`-denied users to `/dashboard`, which 404s. Also the landing surface after login. | 1.3 |
| **1.5** | **Rate limiting + abuse protection** | `POST /api/assessments` is public and writes two rows per call with no throttle. Trivially floodable; unbounded cost. Cannot expose publicly without it. | 1.1 |
| **1.6** | **Security headers + CSRF** | CSP, HSTS, frame options unset; cookie-auth POSTs open to cross-site submission. | 1.1 |
| **1.7** | **Email delivery** | `resumeToken` is generated but never sent, so "resume later" — a core funnel feature — is unreachable. Also blocks password reset and notifications. | 1.3 |
| **1.8** | **Assessment history + resume** | Users must be able to return to prior audits. Backend supports it; no UI. | 1.4, 1.7 |
| **1.9** | **Admin dashboard shell + role management** | Staff cannot administer anything. Question/category management have nowhere to live. | 1.3 |
| **1.10** | **Question + category management UI** | Content is currently only editable by re-running the seed. The whole point of the DB-backed bank is consultant self-service. | 1.9 |
| **1.11** | **PDF report generator** | The report screen's download button is inert. The PDF is the deliverable clients expect from an audit. | 1.2 |
| **1.12** | **Proposal generator UI** | Backend generates proposals; no interface to review, edit, or send. This is the revenue step. | 1.9 |
| **1.13** | **Business landing page** | `/` is the audit itself. No positioning, no trust signals, no conversion path. | 1.2 |
| **1.14** | **Client + company profile** | Clients cannot correct their own details after an anonymous audit. | 1.4 |
| **1.15** | **Loading, error, and empty states** | Required by the development standard for every feature; currently absent everywhere. | 1.2 |
| **1.16** | **Mobile responsiveness + accessibility** | Scale buttons collapse below ~380 px; no ARIA roles, no focus management. Launch-blocking for a public marketing tool. | 1.2 |
| **1.17** | **Fix Bugs 1–5** | See `DEVELOPMENT_STATUS.md`. Includes the render-phase `setState` and unvalidated `optionId` persistence. | 1.2 |
| **1.18** | **Retire duplicate scoring + question bank** | Two sources of truth for the number the product sells. Must collapse to one before content diverges. | 1.2 |

## Priority 2 — Should have

| # | Feature |
|---|---|
| 2.1 | Staff dashboard |
| 2.2 | Lead management + CRM pipeline |
| 2.3 | Client notes |
| 2.4 | Excel export |
| 2.5 | Analytics dashboard (completion rate, drop-off per question, average score) |
| 2.6 | Audit logs for privileged actions |
| 2.7 | Notification centre |
| 2.8 | Settings (org profile, branding, defaults) |
| 2.9 | Conditional-logic builder UI |
| 2.10 | Scoring-rules editor |
| 2.11 | Service management UI |
| 2.12 | Pricing calculator |
| 2.13 | Book consultation + Calendly integration |
| 2.14 | Question-bank versioning (see Database Improvement 4) |
| 2.15 | Soft deletes for categories/questions |
| 2.16 | Structured logging + error tracking |
| 2.17 | Performance: middleware short-circuit, cached role, dynamic Recharts import |

## Priority 3 — Nice to have

| # | Feature |
|---|---|
| 3.1 | Project creation + tracking |
| 3.2 | Recommendation-engine tuning UI |
| 3.3 | Keyboard shortcuts for the question flow |
| 3.4 | Autosave indicator |
| 3.5 | Edit answers from the report screen |
| 3.6 | "Why we ask this" disclosure using the existing `purpose` field |
| 3.7 | Dark/light theme toggle |
| 3.8 | `prefers-reduced-motion` support |
| 3.9 | Report sharing via public link |
| 3.10 | Benchmark comparison against industry averages |
| 3.11 | PII retention + deletion policy tooling |

## Priority 4 — Future roadmap

| # | Feature |
|---|---|
| 4.1 | OpenAI integration (foundation for all AI features) |
| 4.2 | AI business consultant |
| 4.3 | Narrative AI report generation |
| 4.4 | Website analyzer |
| 4.5 | SEO analyzer |
| 4.6 | Performance analyzer |
| 4.7 | Competitor analysis |
| 4.8 | Social media audit |
| 4.9 | Google Business audit |
| 4.10 | Content planner |
| 4.11 | Marketing planner |
| 4.12 | Sales planner |
| 4.13 | Growth roadmap generator |
| 4.14 | RAG knowledge base |
| 4.15 | Chat assistant |
| 4.16 | Multi-tenant architecture |
| 4.17 | White-label mode |
| 4.18 | Agency portal |

---

## Note on sequencing

**1.1 and 1.2 are not negotiable as the first two items.** Every other feature
either writes tests that need a runner, or reads/writes data through a UI that
currently cannot reach the database. Building any further feature before these
two would add more code to an app that still persists nothing.

**Multi-tenancy (4.16) has a schema implication today.** Retrofitting a tenant
boundary across nine tables after launch is materially harder than reserving
the column now. Flagged for an explicit decision before 1.0 ships, even though
the feature itself is P4.
