import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { REQUIRED_ENV_VARS, readSupabaseEnv } from "@/lib/env";

const ORIGINAL = { ...process.env };

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("readSupabaseEnv", () => {
  it("returns the credentials when both are set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    const result = readSupabaseEnv();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.env).toEqual({ url: "https://proj.supabase.co", anonKey: "anon-key" });
    }
  });

  it("reports both as missing when neither is set", () => {
    const result = readSupabaseEnv();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toEqual([
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ]);
    }
  });

  it("names only the variable that is actually missing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";

    const result = readSupabaseEnv();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.missing).toEqual(["NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
  });

  it("treats an empty string as missing", () => {
    // A variable created in a dashboard but left blank is a common mistake;
    // passing "" to the Supabase client throws exactly like undefined does.
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    const result = readSupabaseEnv();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.missing).toEqual(["NEXT_PUBLIC_SUPABASE_URL"]);
  });

  it("treats a whitespace-only value as missing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "   ";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    const result = readSupabaseEnv();
    expect(result.ok).toBe(false);
  });

  it("trims surrounding whitespace from pasted values", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "  https://proj.supabase.co  ";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = " anon-key\n";

    const result = readSupabaseEnv();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.env.url).toBe("https://proj.supabase.co");
      expect(result.env.anonKey).toBe("anon-key");
    }
  });

  it("never throws, so it is safe at middleware module scope", () => {
    expect(() => readSupabaseEnv()).not.toThrow();
  });
});

describe("REQUIRED_ENV_VARS", () => {
  it("lists every variable the deployed app needs", () => {
    expect([...REQUIRED_ENV_VARS]).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "DATABASE_URL",
      "DIRECT_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]);
  });
});
