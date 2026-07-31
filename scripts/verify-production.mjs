#!/usr/bin/env node
/**
 * Production verification suite.
 *
 *   node scripts/verify-production.mjs https://your-domain.vercel.app
 *
 * Exercises the deployed application as a real anonymous visitor and asserts
 * the behaviour of every subsystem reachable without credentials. Exits
 * non-zero if any check fails, so it can gate a release.
 *
 * Deliberately NOT covered (requires a real signed-in session — see
 * DEPLOYMENT_CHECKLIST.md for the manual equivalents):
 *   - signing in with a real password
 *   - the dashboard rendered for a logged-in client
 *   - admin pages rendered for a STAFF/ADMIN user
 * For those, this suite verifies the *gate* rather than the page: that an
 * anonymous caller is redirected or rejected, which is the security-relevant
 * property.
 */

const BASE = (process.argv[2] || "").replace(/\/$/, "");
if (!BASE) {
  console.error("Usage: node scripts/verify-production.mjs <base-url>");
  process.exit(2);
}

let passed = 0;
let failed = 0;
const failures = [];
let currentSection = "";

function section(name) {
  currentSection = name;
  console.log(`\n${name}`);
}

function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    failures.push(`[${currentSection}] ${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
  return ok;
}

async function get(path, options = {}) {
  return fetch(BASE + path, { redirect: "manual", ...options });
}

async function postJson(path, body) {
  return fetch(BASE + path, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function main() {
  console.log(`\nVerifying production deployment at ${BASE}`);

  // === 1. Environment variables (inferred from behaviour) =================
  section("1. Environment variables");
  const home = await get("/");
  const homeHtml = await home.text();
  check("app responds at all", home.status === 200, `status ${home.status}`);
  check(
    "no MIDDLEWARE_INVOCATION_FAILED",
    home.status !== 500,
    home.status === 500 ? "Supabase vars likely missing at BUILD time — see VERCEL_SETUP.md" : ""
  );

  // === 2. Middleware ======================================================
  section("2. Middleware");
  check("public route not blocked by middleware", home.status === 200, `status ${home.status}`);
  const dash = await get("/dashboard");
  check(
    "protected route gated",
    dash.status === 307 || dash.status === 302,
    `status ${dash.status}`
  );
  const loc = dash.headers.get("location") ?? "";
  check("gate redirects to /login", loc.includes("/login"), loc || "no location header");
  check("gate preserves the return path", loc.includes("next="), loc);

  // === 3. Database connection =============================================
  section("3. Database connection");
  const catRes = await get("/api/categories");
  check("GET /api/categories succeeds", catRes.status === 200, `status ${catRes.status}`);
  let categories = [];
  if (catRes.status === 200) {
    const body = await catRes.json();
    categories = body.categories ?? [];
  }
  check("question bank is seeded", categories.length > 0, `${categories.length} categories`);
  const questionCount = categories.reduce((n, c) => n + c.questions.length, 0);
  check("questions present", questionCount > 0, `${questionCount} questions`);

  // === 4. Security ========================================================
  section("4. Security checks");
  for (const ep of [
    "/api/questions",
    "/api/clients",
    "/api/services",
    "/api/proposals",
    "/api/consultations",
    "/api/admin/export/json",
  ]) {
    const r = await get(ep);
    check(`GET ${ep} rejects anonymous`, r.status === 401, `status ${r.status}`);
  }
  const writeGuard = await postJson("/api/categories", { name: "x", slug: "x" });
  check("POST /api/categories rejects anonymous", writeGuard.status === 401, `status ${writeGuard.status}`);
  check(
    "internal `purpose` field hidden from anonymous callers",
    categories.every((c) => c.questions.every((q) => !("purpose" in q)))
  );
  const adminGate = await get("/admin");
  check(
    "admin area gated",
    adminGate.status === 307 || adminGate.status === 302,
    `status ${adminGate.status}`
  );

  // === 5. Supabase authentication surface =================================
  section("5. Supabase authentication");
  // Assert on the server-rendered <title>: the form itself is a client
  // component inside <Suspense>, so its heading is not in the initial HTML.
  for (const [path, title] of [
    ["/login", "Sign in"],
    ["/register", "Create account"],
    ["/forgot-password", "Reset password"],
    ["/reset-password", "Choose a new password"],
  ]) {
    const r = await get(path);
    const html = r.status === 200 ? await r.text() : "";
    const titleMatch = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
    check(
      `${path} renders`,
      r.status === 200 && titleMatch.includes(title),
      `status ${r.status}${titleMatch ? `, title "${titleMatch}"` : ""}`
    );
  }
  const signout = await get("/auth/signout");
  check(
    "signout rejects GET (POST-only)",
    signout.status === 405 || signout.status === 404,
    `status ${signout.status}`
  );
  const callback = await get("/auth/callback");
  check(
    "auth callback without a code redirects rather than crashing",
    callback.status !== 500,
    `status ${callback.status}`
  );

  if (categories.length === 0) {
    console.log("\nQuestion bank empty — remaining checks cannot run. Run `npm run db:seed`.");
    return summary();
  }

  // === 6. Assessment creation + database writes ===========================
  section("6. Assessment creation & database writes");
  const startRes = await postJson("/api/assessments", {
    businessName: "Production Verification",
    email: "verify@example.com",
  });
  check("POST /api/assessments creates one", startRes.status === 201, `status ${startRes.status}`);
  const started = startRes.status === 201 ? await startRes.json() : {};
  const id = started.assessment?.id;
  const token = started.assessment?.resumeToken;
  check("assessment row written", Boolean(id), id ?? "no id");
  check("resume token issued", Boolean(token));
  const invalid = await postJson("/api/assessments", {});
  check("invalid payload rejected", invalid.status === 400, `status ${invalid.status}`);

  if (!id || !token) return summary();
  const tq = `?token=${encodeURIComponent(token)}`;

  // === 7. Autosave =========================================================
  section("7. Autosave");
  const firstQ = categories[0].questions.find((q) => !q.showIfJson) ?? categories[0].questions[0];
  const firstOpt = firstQ.options?.[0];
  const saveRes = await postJson(`/api/assessments/${id}/answer${tq}`, {
    questionId: firstQ.id,
    answer: firstOpt ? { optionId: firstOpt.id } : { value: 5 },
  });
  check("answer autosaves", saveRes.status === 200, `status ${saveRes.status}`);
  const noToken = await postJson(`/api/assessments/${id}/answer`, {
    questionId: firstQ.id,
    answer: firstOpt ? { optionId: firstOpt.id } : { value: 5 },
  });
  check("autosave rejects a missing token", noToken.status === 403, `status ${noToken.status}`);

  // === 8. Resume ===========================================================
  section("8. Resume assessment");
  const resumeApi = await get(`/api/assessments/${id}${tq}`);
  check("saved assessment is retrievable", resumeApi.status === 200, `status ${resumeApi.status}`);
  if (resumeApi.status === 200) {
    const body = await resumeApi.json();
    const answered = Object.keys(body.assessment?.answersJson ?? {}).length;
    check("saved answers persisted", answered > 0, `${answered} answer(s)`);
  }
  const resumePage = await get(`/audit/${id}${tq}`);
  check("resume page loads", resumePage.status === 200, `status ${resumePage.status}`);
  const badToken = await get(`/api/assessments/${id}?token=wrong-token`);
  check("wrong token rejected", badToken.status === 403, `status ${badToken.status}`);

  // === 9. Report generation ===============================================
  section("9. Report generation");
  for (const cat of categories) {
    for (const q of cat.questions) {
      if (q.showIfJson) continue;
      const answer = q.type === "SCALE" ? { value: 3 } : q.options?.length ? { optionId: q.options[0].id } : null;
      if (!answer) continue;
      await postJson(`/api/assessments/${id}/answer${tq}`, { questionId: q.id, answer });
    }
  }
  const liveRes = await get(`/api/assessments/${id}/report${tq}`);
  check("live report available", liveRes.status === 200, `status ${liveRes.status}`);
  const live = liveRes.status === 200 ? await liveRes.json() : {};
  check("live preview flagged as live", live.live === true);
  check("score computed", typeof live.report?.overall === "number", `overall ${live.report?.overall?.toFixed?.(1)}`);
  check("recommendations generated", (live.report?.recommendations?.length ?? 0) > 0, `${live.report?.recommendations?.length} recs`);
  check(
    "recommendations de-duplicated",
    new Set((live.report?.recommendations ?? []).map((r) => r.serviceId)).size ===
      (live.report?.recommendations?.length ?? 0)
  );

  const completeRes = await postJson(`/api/assessments/${id}/complete${tq}`, {});
  check("assessment completes", completeRes.status === 200, `status ${completeRes.status}`);
  const completed = completeRes.status === 200 ? await completeRes.json() : {};
  check("status is COMPLETED", completed.assessment?.status === "COMPLETED", completed.assessment?.status);
  check(
    "90-day roadmap populated",
    (completed.report?.roadmap?.days1to30?.length ?? 0) +
      (completed.report?.roadmap?.days31to60?.length ?? 0) +
      (completed.report?.roadmap?.days61to90?.length ?? 0) > 0
  );
  const frozenRes = await get(`/api/assessments/${id}/report${tq}`);
  const frozen = frozenRes.status === 200 ? await frozenRes.json() : {};
  check("completed report served from frozen snapshot", frozen.live === false);
  const doubleComplete = await postJson(`/api/assessments/${id}/complete${tq}`, {});
  check("double-complete rejected", doubleComplete.status === 409, `status ${doubleComplete.status}`);
  const reportPage = await get(`/report/${id}${tq}`);
  check("report page renders", reportPage.status === 200, `status ${reportPage.status}`);

  // === 10. PDF generation =================================================
  section("10. PDF generation");
  const pdfRes = await get(`/api/assessments/${id}/pdf${tq}`);
  check("PDF endpoint responds", pdfRes.status === 200, `status ${pdfRes.status}`);
  if (pdfRes.status === 200) {
    const buf = Buffer.from(await pdfRes.arrayBuffer());
    check("output really is a PDF", buf.subarray(0, 5).toString("latin1") === "%PDF-", buf.subarray(0, 5).toString("latin1"));
    check("PDF has meaningful size", buf.length > 1000, `${buf.length} bytes`);
    check(
      "served as a download",
      (pdfRes.headers.get("content-disposition") ?? "").includes("attachment")
    );
    check(
      "PDF not cached by intermediaries",
      (pdfRes.headers.get("cache-control") ?? "").includes("no-store")
    );
  }
  const pdfNoToken = await get(`/api/assessments/${id}/pdf`);
  check("PDF rejects a missing token", pdfNoToken.status === 403, `status ${pdfNoToken.status}`);

  // === 11. Consultation booking ===========================================
  section("11. Consultation booking");
  const consultPage = await get("/consultation");
  check("consultation page renders", consultPage.status === 200, `status ${consultPage.status}`);
  const consultRes = await postJson("/api/consultations", {
    name: "Production Verification",
    email: "verify@example.com",
    assessmentId: id,
    token,
  });
  check("consultation request stored", consultRes.status === 201, `status ${consultRes.status}`);
  const consultInvalid = await postJson("/api/consultations", { name: "x", email: "not-an-email" });
  check("invalid consultation rejected", consultInvalid.status === 400, `status ${consultInvalid.status}`);

  // === 12. Dashboard / Admin / Question management gates ==================
  section("12. Dashboard, admin & question management");
  for (const [path, label] of [
    ["/dashboard", "Dashboard"],
    ["/dashboard/history", "Assessment history"],
    ["/admin", "Admin dashboard"],
    ["/admin/questions", "Question management"],
  ]) {
    const r = await get(path);
    check(
      `${label} requires a session`,
      r.status === 307 || r.status === 302,
      `status ${r.status}`
    );
  }
  const reorderGuard = await postJson("/api/questions/reorder", { items: [{ id: "x", order: 0 }] });
  check("question reorder rejects anonymous", reorderGuard.status === 401, `status ${reorderGuard.status}`);

  summary();
}

function summary() {
  console.log(`\n${"=".repeat(58)}`);
  if (failed > 0) {
    console.log(`${passed} passed, ${failed} FAILED\n`);
    console.log("Failures:");
    for (const f of failures) console.log(`  ✗ ${f}`);
    console.log("\nSee VERCEL_SETUP.md and SUPABASE_SETUP.md for fixes.");
  } else {
    console.log(`${passed} passed, 0 failed — deployment verified.`);
  }
  console.log(`${"=".repeat(58)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(`\nVerification crashed: ${error.message}`);
  console.error("The deployment is likely unreachable or returning malformed responses.");
  process.exit(1);
});
