#!/usr/bin/env node
/**
 * End-to-end verification against a deployed instance.
 *
 *   node scripts/verify-deployment.mjs https://your-app.vercel.app
 *
 * Exercises the public audit path exactly as a real anonymous visitor
 * would: homepage, question bank, start, conditional gating, autosave,
 * scoring, completion, and report generation — plus confirms every
 * privileged endpoint rejects unauthenticated callers.
 *
 * Exits non-zero if any check fails, so it can gate a deploy.
 */

const BASE = (process.argv[2] || "").replace(/\/$/, "");
if (!BASE) {
  console.error("Usage: node scripts/verify-deployment.mjs <base-url>");
  process.exit(2);
}

let passed = 0;
let failed = 0;

function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
  return ok;
}

async function main() {
  console.log(`\nVerifying deployment at ${BASE}\n`);

  // --- 1. Homepage -------------------------------------------------------
  console.log("Homepage");
  const home = await fetch(BASE + "/");
  const homeHtml = await home.text();
  check("serves 200", home.status === 200, `status ${home.status}`);
  check(
    "renders the audit intro",
    homeHtml.includes("BUSINESS GROWTH AUDIT") || homeHtml.includes("Begin the audit"),
    "intro copy present"
  );

  // --- 2. Question bank / DB connection ----------------------------------
  console.log("\nDatabase connection & question bank");
  const catRes = await fetch(BASE + "/api/categories");
  check("GET /api/categories is 200", catRes.status === 200, `status ${catRes.status}`);
  const catBody = await catRes.json();
  const cats = catBody.categories ?? [];
  check("returns seeded categories", cats.length > 0, `${cats.length} categories`);
  const totalQuestions = cats.reduce((s, c) => s + c.questions.length, 0);
  check("returns questions", totalQuestions > 0, `${totalQuestions} questions`);
  check(
    "hides internal `purpose` from anonymous callers",
    cats.every((c) => c.questions.every((q) => !("purpose" in q)))
  );

  if (!cats.length) {
    console.log("\nNo question bank found — did you run `npm run db:seed`?");
    summary();
    return;
  }

  // --- 3. Auth gating ----------------------------------------------------
  console.log("\nAuthentication gating (anonymous must be rejected)");
  for (const ep of [
    "/api/questions",
    "/api/clients",
    "/api/services",
    "/api/proposals",
    "/api/admin/export/json",
  ]) {
    const r = await fetch(BASE + ep);
    check(`GET ${ep} rejects anonymous`, r.status === 401, `status ${r.status}`);
  }
  const postGuard = await fetch(BASE + "/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "x", slug: "x" }),
  });
  check("POST /api/categories rejects anonymous", postGuard.status === 401, `status ${postGuard.status}`);

  // --- 4. Start assessment (database write) ------------------------------
  console.log("\nStart assessment (database write)");
  const startRes = await fetch(BASE + "/api/assessments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessName: "Deployment Smoke Test", email: "smoke@test.example" }),
  });
  check("POST /api/assessments is 201", startRes.status === 201, `status ${startRes.status}`);
  const started = await startRes.json();
  const id = started.assessment?.id;
  const token = started.assessment?.resumeToken;
  check("assessment row created", Boolean(id), id ? `id ${id}` : "no id returned");
  check("resumeToken issued for anonymous audit", Boolean(token));

  const invalid = await fetch(BASE + "/api/assessments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  check("rejects invalid payload with 400", invalid.status === 400, `status ${invalid.status}`);

  if (!id || !token) {
    summary();
    return;
  }

  // --- 5. Conditional logic ---------------------------------------------
  console.log("\nConditional logic (gating)");
  const webCat = cats.find((c) => c.slug === "website-digital-presence") ?? cats[0];
  const webQ = webCat.questions[0];
  const noWebsite = webQ.options.find((o) => o.label === "No website");
  const gated = webCat.questions.filter((q) => q.showIfJson);
  check("gated follow-up questions exist", gated.length > 0, `${gated.length} gated`);

  await post(`/api/assessments/${id}/answer?token=${token}`, {
    questionId: webQ.id,
    answer: { optionId: noWebsite.id },
  });

  // Answering a gated-out question must not affect the score.
  const before = await getReport(id, token);
  const speedQ = gated[0];
  if (speedQ) {
    await post(`/api/assessments/${id}/answer?token=${token}`, {
      questionId: speedQ.id,
      answer: speedQ.type === "SCALE" ? { value: 10 } : { optionId: speedQ.options.at(-1).id },
    });
    const after = await getReport(id, token);
    const beforeScore = before.report.categoryScores.find((c) => c.categoryId === webCat.id)?.score;
    const afterScore = after.report.categoryScores.find((c) => c.categoryId === webCat.id)?.score;
    check(
      "answers to gated-out questions are excluded from scoring",
      beforeScore === afterScore,
      `${beforeScore} -> ${afterScore}`
    );
  }

  // --- 6. Access control on the assessment -------------------------------
  console.log("\nAssessment access control");
  const noTok = await fetch(BASE + `/api/assessments/${id}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId: webQ.id, answer: { optionId: noWebsite.id } }),
  });
  check("answer without token is 403", noTok.status === 403, `status ${noTok.status}`);
  const badTok = await fetch(BASE + `/api/assessments/${id}/report?token=wrong-token`);
  check("report with wrong token is 403", badTok.status === 403, `status ${badTok.status}`);

  // --- 7. Full audit flow + score calculation ----------------------------
  console.log("\nFull audit flow & score calculation");
  for (const cat of cats) {
    for (const q of cat.questions) {
      if (q.showIfJson) continue;
      const answer =
        q.type === "SCALE" ? { value: 1 } : q.options?.length ? { optionId: q.options[0].id } : null;
      if (!answer) continue;
      await post(`/api/assessments/${id}/answer?token=${token}`, { questionId: q.id, answer });
    }
  }
  const live = await getReport(id, token);
  check("live report served while in progress", live.live === true);
  check(
    "worst-case answers produce a low score",
    live.report.overall >= 0 && live.report.overall < 25,
    `overall ${live.report.overall.toFixed(1)}`
  );
  check(
    "recommendations triggered",
    live.report.recommendations.length > 0,
    `${live.report.recommendations.length} recommendations`
  );
  check(
    "recommendations de-duplicated by service",
    new Set(live.report.recommendations.map((r) => r.serviceId)).size ===
      live.report.recommendations.length
  );
  check(
    "high priority sorted first",
    live.report.recommendations[0]?.priority === "HIGH",
    live.report.recommendations[0]?.priority
  );

  // --- 8. Report generation & immutability -------------------------------
  console.log("\nReport generation");
  const compRes = await fetch(BASE + `/api/assessments/${id}/complete?token=${token}`, {
    method: "POST",
  });
  check("POST complete is 200", compRes.status === 200, `status ${compRes.status}`);
  const comp = await compRes.json();
  check("status is COMPLETED", comp.assessment?.status === "COMPLETED", comp.assessment?.status);
  const r = comp.report;
  check("report has category scores", r.categoryScores.length > 0, `${r.categoryScores.length}`);
  check("report has weaknesses", r.weaknesses.length > 0, `${r.weaknesses.length}`);
  check(
    "90-day roadmap populated",
    r.roadmap.days1to30.length + r.roadmap.days31to60.length + r.roadmap.days61to90.length > 0,
    `${r.roadmap.days1to30.length}/${r.roadmap.days31to60.length}/${r.roadmap.days61to90.length}`
  );
  check("budget band computed", r.budget.max > 0, `${r.budget.min} - ${r.budget.max}`);

  const frozen = await getReport(id, token);
  check("completed report served from frozen snapshot", frozen.live === false);
  const dbl = await fetch(BASE + `/api/assessments/${id}/complete?token=${token}`, { method: "POST" });
  check("double-complete rejected with 409", dbl.status === 409, `status ${dbl.status}`);
  const late = await fetch(BASE + `/api/assessments/${id}/answer?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId: webQ.id, answer: { optionId: noWebsite.id } }),
  });
  check("answering after completion rejected with 409", late.status === 409, `status ${late.status}`);

  summary();
}

async function post(path, body) {
  return fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function getReport(id, token) {
  const res = await fetch(BASE + `/api/assessments/${id}/report?token=${token}`);
  return res.json();
}

function summary() {
  console.log(`\n${"-".repeat(50)}`);
  console.log(`${passed} passed, ${failed} failed`);
  console.log(`${"-".repeat(50)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("\nVerification crashed:", err.message);
  process.exit(1);
});
