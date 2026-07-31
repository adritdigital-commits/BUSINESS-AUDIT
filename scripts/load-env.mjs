/**
 * Loads `.env` into process.env for the plain-Node scripts in this folder.
 *
 * Why this exists
 * ---------------
 * The Prisma CLI and Next.js both read `.env` automatically, but a bare
 * `node scripts/foo.mjs` does not. That asymmetry made every script here
 * report a correctly-configured local machine as unconfigured:
 *
 *   npm run check-env      → "Missing: DATABASE_URL, DIRECT_URL, ..."
 *   npm run db:baseline    → "Refusing to baseline: DIRECT_URL is not set"
 *   npm run db:migrate:dev → "Refusing to run: no DATABASE_URL or DIRECT_URL"
 *
 * ...while `npm run db:migrate` worked, because Prisma loaded the same file.
 *
 * A real environment variable ALWAYS wins over the file. That ordering is
 * what makes this safe on Vercel and in CI, where the platform injects the
 * real values and a stray committed `.env` must never shadow them. It also
 * matches how Next.js and `node --env-file` resolve the same conflict.
 *
 * Deliberately dependency-free (no dotenv): these scripts run before
 * `npm ci` has necessarily finished in some CI orderings.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * @param {string} [file] path to the env file, relative to cwd
 * @returns {string[]} names of the variables actually applied
 */
export function loadEnvFile(file = ".env") {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return [];

  const applied = [];
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const withoutExport = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eq = withoutExport.indexOf("=");
    if (eq <= 0) continue;

    const key = withoutExport.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    // Never clobber a real environment variable — see note above.
    if (process.env[key] !== undefined && process.env[key] !== "") continue;

    let value = withoutExport.slice(eq + 1).trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length > 1) {
      value = value.slice(1, -1);
      if (quote === '"') value = value.replace(/\\n/g, "\n");
    } else {
      // Strip a trailing unquoted comment: FOO=bar # note
      const hash = value.indexOf(" #");
      if (hash !== -1) value = value.slice(0, hash).trim();
    }

    process.env[key] = value;
    applied.push(key);
  }

  return applied;
}
