import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The frontend must run with no backend at all: no database, no Supabase, no
 * route handlers, no network calls. That is a property of the source tree, so
 * it is asserted against the source tree rather than trusted to review.
 *
 * `src/_deferred` is where the Prisma/Supabase code lives. It is excluded
 * from tsconfig, eslint and vitest, and nothing outside it may import it.
 */

const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");
const DEFERRED = join(SRC, "_deferred");

/** Every source file the application actually compiles. */
function activeSourceFiles(): string[] {
  const files: string[] = [];

  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (path === DEFERRED) continue;
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry)) continue;
      // This file names the very patterns it forbids.
      if (path === __filename) continue;
      files.push(path);
    }
  }

  walk(SRC);
  return files;
}

const FILES = activeSourceFiles();

/** Reports every file whose contents match, with the offending line. */
function offenders(pattern: RegExp): string[] {
  const found: string[] = [];
  for (const file of FILES) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, index) => {
      // A match inside a comment is prose, not a dependency.
      const code = line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");
      if (pattern.test(code)) {
        found.push(`${relative(ROOT, file)}:${index + 1}  ${line.trim()}`);
      }
      pattern.lastIndex = 0;
    });
  }
  return found;
}

describe("the frontend runs without a backend", () => {
  it("finds source files to check", () => {
    expect(FILES.length).toBeGreaterThan(20);
  });

  it("has no route handlers, so nothing can answer /api/*", () => {
    expect(existsSync(join(SRC, "app", "api"))).toBe(false);
  });

  it("has no middleware, so no request is intercepted by Supabase", () => {
    expect(existsSync(join(SRC, "middleware.ts"))).toBe(false);
    expect(existsSync(join(ROOT, "middleware.ts"))).toBe(false);
  });

  it("makes no HTTP calls of any kind", () => {
    expect(offenders(/\bfetch\s*\(/)).toEqual([]);
    expect(offenders(/\bXMLHttpRequest\b/)).toEqual([]);
    expect(offenders(/\bnavigator\.sendBeacon\b/)).toEqual([]);
  });

  it("references no API path", () => {
    expect(offenders(/["'`]\/api\//)).toEqual([]);
  });

  it("imports no HTTP or data-fetching client", () => {
    const clients = /\b(?:from|import)\s*\(?\s*["'](?:axios|swr|@tanstack\/react-query|react-query|ky|superagent)["']/;
    expect(offenders(clients)).toEqual([]);
  });

  it("imports nothing from Prisma or Supabase", () => {
    const backend = /\b(?:from|import)\s*\(?\s*["'](?:@prisma\/client|\.prisma\/client|@supabase\/[^"']+)["']/;
    expect(offenders(backend)).toEqual([]);
  });

  it("imports none of the deferred server modules", () => {
    const deferred =
      /\b(?:from|import)\s*\(?\s*["']@\/(?:lib\/(?:prisma|auth|api|apiClient|questionBank|assessmentAccess|dashboardData|adminStats|dbDiagnostics|env|supabase\/[^"']*|scoring|report)|_deferred\/[^"']*)["']/;
    expect(offenders(deferred)).toEqual([]);
  });

  it("declares no server actions", () => {
    expect(offenders(/^\s*["']use server["']/)).toEqual([]);
  });

  it("keeps every question and service local to the bundle", () => {
    const bank = readFileSync(join(SRC, "data", "questionBank.ts"), "utf8");
    const services = readFileSync(join(SRC, "data", "services.ts"), "utf8");
    for (const source of [bank, services]) {
      expect(/\bfetch\s*\(/.test(source)).toBe(false);
      expect(/https?:\/\//.test(source)).toBe(false);
    }
  });

  it("loads no font, style or script from a third-party origin", () => {
    // Anything absolute would be a network request the offline flow cannot make.
    const remote = offenders(/["'`]https?:\/\/(?!localhost)/);
    expect(remote).toEqual([]);
  });

  it("keeps the deferred tree out of the compiler and the test run", () => {
    const tsconfig = readFileSync(join(ROOT, "tsconfig.json"), "utf8");
    expect(tsconfig).toContain("src/_deferred");

    const vitest = readFileSync(join(ROOT, "vitest.config.mts"), "utf8");
    expect(vitest).toContain("src/_deferred");

    const eslint = readFileSync(join(ROOT, ".eslintrc.json"), "utf8");
    expect(eslint).toContain("src/_deferred");
  });

  it("keeps Prisma out of the install and build path", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    expect(pkg.scripts.build).toBe("next build");
    expect(pkg.scripts.postinstall).toBeUndefined();
  });

  it("routes only the pages the audit journey needs", () => {
    const appDir = join(SRC, "app");
    const routes = readdirSync(appDir)
      .filter((entry) => statSync(join(appDir, entry)).isDirectory())
      .filter((entry) => entry !== "fonts")
      .sort();
    expect(routes).toEqual(["audit", "proposal", "report"]);
  });

  it("puts every page's directory separator check on a real path", () => {
    // Guards the walker itself: a bad join would silently check nothing.
    expect(FILES.every((file) => file.startsWith(SRC + sep))).toBe(true);
  });
});
