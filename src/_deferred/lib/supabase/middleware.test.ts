import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Regression tests for the production outage: middleware threw
 * MIDDLEWARE_INVOCATION_FAILED on every route when the Supabase environment
 * variables were absent, taking down public pages that need no auth at all.
 */

const getUser = vi.fn();
const from = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: (url: string, key: string) => {
    // Mirror the real client: it throws when credentials are absent.
    if (!url || !key) {
      throw new Error("Your project's URL and Key are required to create a Supabase client!");
    }
    return { auth: { getUser }, from };
  },
}));

const ORIGINAL = { ...process.env };

function request(path: string) {
  return new NextRequest(new URL(`https://example.com${path}`));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  getUser.mockResolvedValue({ data: { user: null } });
});

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.restoreAllMocks();
});

describe("updateSession — missing environment variables", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("does not throw on a public route", async () => {
    await expect(updateSession(request("/"))).resolves.toBeDefined();
  });

  it("lets the public homepage through instead of failing the request", async () => {
    const response = await updateSession(request("/"));
    expect(response.status).toBe(200);
  });

  it("does not throw on a protected route either", async () => {
    // Protected pages re-check auth server-side, so passing through here
    // does not weaken authorization.
    await expect(updateSession(request("/dashboard"))).resolves.toBeDefined();
    await expect(updateSession(request("/admin"))).resolves.toBeDefined();
  });

  it("never constructs a Supabase client with empty credentials", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
    await expect(updateSession(request("/"))).resolves.toBeDefined();
  });

  it("logs which variables are missing", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await updateSession(request("/"));

    const logged = spy.mock.calls.flat().join(" ");
    expect(logged).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(logged).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(logged).toContain("redeploy");
  });
});

describe("updateSession — configured correctly", () => {
  it("redirects an anonymous visitor away from a protected route", async () => {
    const response = await updateSession(request("/dashboard"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
    expect(response.headers.get("location")).toContain("next=%2Fdashboard");
  });

  it("lets an anonymous visitor reach a public route", async () => {
    const response = await updateSession(request("/"));
    expect(response.status).toBe(200);
  });

  it("sends a signed-in non-staff user away from /admin", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    from.mockReturnValue({
      select: () => ({ eq: () => ({ single: async () => ({ data: { role: "CLIENT" } }) }) }),
    });

    const response = await updateSession(request("/admin"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("lets a staff user into /admin", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    from.mockReturnValue({
      select: () => ({ eq: () => ({ single: async () => ({ data: { role: "STAFF" } }) }) }),
    });

    const response = await updateSession(request("/admin"));
    expect(response.status).toBe(200);
  });
});

describe("updateSession — auth provider failure", () => {
  it("does not take the site down when Supabase is unreachable", async () => {
    getUser.mockRejectedValue(new Error("fetch failed"));

    const response = await updateSession(request("/"));
    expect(response.status).toBe(200);
  });

  it("does not throw when the profile lookup fails", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    from.mockReturnValue({
      select: () => ({ eq: () => ({ single: async () => { throw new Error("db down"); } }) }),
    });

    await expect(updateSession(request("/admin"))).resolves.toBeDefined();
  });
});
