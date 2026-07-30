# RakeshProTech Business Growth Audit

Next.js port of the interactive business growth audit prototype: 8 categories,
conditional question logic, weighted per-category scoring, a Digital Maturity
Score with radar chart, and an auto-generated consulting-style report with
strengths, gaps, recommendations, and a 90-day roadmap.

This is a direct client-side port of the original prototype (`audit.jsx`) —
no database, auth, or admin panel yet. See `RakeshProTechAuditArchitecture.md`
for the full production build plan (Prisma/Supabase schema, admin panel,
PDF/Excel export, client dashboard) that this prototype scales into.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The entire audit engine lives in `src/components/AuditApp.tsx`: the question
bank (`CATEGORIES`), the scoring engine, and all three screens (intro,
question flow, report).
