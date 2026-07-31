import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuestionManager from "@/components/admin/QuestionManager";
import type { ApiCategory } from "@/lib/apiClient";

const q = (id: string, text: string, order: number) => ({
  id,
  categoryId: "cat1",
  text,
  type: "CHOICE" as const,
  order,
  showIfJson: null,
  scaleMin: null,
  scaleMax: null,
  options: [],
});

const CATEGORIES: ApiCategory[] = [
  {
    id: "cat1",
    name: "Website",
    slug: "website",
    weight: 1,
    order: 0,
    questions: [q("q1", "First question", 0), q("q2", "Second question", 1)],
  },
];

function mockFetch(overrides: Record<string, () => { ok?: boolean; status?: number; body?: unknown }> = {}) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const key = Object.keys(overrides).find((k) => url.startsWith(k));
    const result = key ? overrides[key]() : {};
    if (url.startsWith("/api/categories") && (!init || init.method !== "POST")) {
      return { ok: true, status: 200, statusText: "", json: async () => ({ categories: CATEGORIES }) } as Response;
    }
    return {
      ok: result.ok ?? true,
      status: result.status ?? 200,
      statusText: "",
      json: async () => result.body ?? {},
    } as Response;
  });
}

beforeEach(() => vi.restoreAllMocks());

describe("QuestionManager", () => {
  it("shows a loading state, then the categories", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const { unmount } = render(<QuestionManager />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading the question bank…");
    unmount();

    vi.stubGlobal("fetch", mockFetch());
    render(<QuestionManager />);
    expect(await screen.findByText("Website")).toBeInTheDocument();
    expect(screen.getByText(/2 questions/)).toBeInTheDocument();
  });

  it("shows an error with retry when loading fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, statusText: "", json: async () => ({ error: "boom" }) }) as Response)
    );
    render(<QuestionManager />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("reorders with a single bulk request carrying the new order", async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<QuestionManager />);

    await screen.findByText("First question");
    await user.click(screen.getByRole("button", { name: 'Move "Second question" up' }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([u]) => String(u) === "/api/questions/reorder");
      expect(call).toBeDefined();
      const payload = JSON.parse((call![1] as RequestInit).body as string);
      // q2 moves to position 0, q1 to position 1.
      expect(payload.items).toEqual([
        { id: "q2", order: 0 },
        { id: "q1", order: 1 },
      ]);
    });
  });

  it("disables moving the first question up and the last one down", async () => {
    vi.stubGlobal("fetch", mockFetch());
    render(<QuestionManager />);

    await screen.findByText("First question");
    expect(screen.getByRole("button", { name: 'Move "First question" up' })).toBeDisabled();
    expect(screen.getByRole("button", { name: 'Move "Second question" down' })).toBeDisabled();
  });

  it("asks for confirmation before deleting and does nothing if declined", async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("confirm", vi.fn(() => false));
    const user = userEvent.setup();
    render(<QuestionManager />);

    await screen.findByText("First question");
    await user.click(screen.getByRole("button", { name: 'Delete "First question"' }));

    expect(fetchMock.mock.calls.some(([, init]) => (init as RequestInit)?.method === "DELETE")).toBe(false);
  });

  it("deletes when confirmed", async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("confirm", vi.fn(() => true));
    const user = userEvent.setup();
    render(<QuestionManager />);

    await screen.findByText("First question");
    await user.click(screen.getByRole("button", { name: 'Delete "First question"' }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([u]) => String(u) === "/api/questions/q1");
      expect((call![1] as RequestInit).method).toBe("DELETE");
    });
  });

  it("derives a slug from the new category name", async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<QuestionManager />);

    await screen.findByText("Website");
    await user.type(screen.getByLabelText("Add a category"), "Customer Support & Care");

    expect(screen.getByText("Slug: customer-support-care")).toBeInTheDocument();
  });

  it("creates a category with the derived slug", async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<QuestionManager />);

    await screen.findByText("Website");
    await user.type(screen.getByLabelText("Add a category"), "Customer Support");
    await user.click(screen.getByRole("button", { name: /Add$/ }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([u, init]) => String(u) === "/api/categories" && (init as RequestInit)?.method === "POST"
      );
      expect(call).toBeDefined();
      expect(JSON.parse((call![1] as RequestInit).body as string)).toEqual({
        name: "Customer Support",
        slug: "customer-support",
      });
    });
  });
});
