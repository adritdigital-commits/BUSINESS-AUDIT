import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConsultationForm from "@/components/consultation/ConsultationForm";

function mockFetch(result: { ok?: boolean; status?: number; body?: unknown }) {
  return vi.fn(async () => ({
    ok: result.ok ?? true,
    status: result.status ?? 201,
    statusText: "",
    json: async () => result.body ?? { consultation: { id: "k1" } },
  })) as unknown as typeof fetch;
}

beforeEach(() => vi.restoreAllMocks());

describe("ConsultationForm", () => {
  it("prefills the name and email of a signed-in client", () => {
    render(<ConsultationForm defaultName="Jane Founder" defaultEmail="jane@acme.com" />);
    expect(screen.getByLabelText("Your name")).toHaveValue("Jane Founder");
    expect(screen.getByLabelText("Email address")).toHaveValue("jane@acme.com");
  });

  it("submits the request and ties it to the originating assessment", async () => {
    const fetchMock = mockFetch({});
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<ConsultationForm assessmentId="a1" token="tok" />);
    await user.type(screen.getByLabelText("Your name"), "Jane");
    await user.type(screen.getByLabelText("Email address"), "jane@acme.com");
    await user.click(screen.getByRole("button", { name: /Request a consultation/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, init] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const payload = JSON.parse((init as RequestInit).body as string);
    expect(payload).toMatchObject({ name: "Jane", email: "jane@acme.com", assessmentId: "a1", token: "tok" });
  });

  it("omits blank optional fields rather than sending empty strings", async () => {
    const fetchMock = mockFetch({});
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<ConsultationForm />);
    await user.type(screen.getByLabelText("Your name"), "Jane");
    await user.type(screen.getByLabelText("Email address"), "jane@acme.com");
    await user.click(screen.getByRole("button", { name: /Request a consultation/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, init] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const payload = JSON.parse((init as RequestInit).body as string);
    expect(payload.phone).toBeUndefined();
    expect(payload.message).toBeUndefined();
    expect(payload.preferredTime).toBeUndefined();
  });

  it("confirms once the request is stored", async () => {
    vi.stubGlobal("fetch", mockFetch({}));
    const user = userEvent.setup();

    render(<ConsultationForm defaultEmail="jane@acme.com" />);
    await user.type(screen.getByLabelText("Your name"), "Jane");
    await user.click(screen.getByRole("button", { name: /Request a consultation/ }));

    expect(await screen.findByText("Request received.")).toBeInTheDocument();
    expect(screen.getByText("jane@acme.com")).toBeInTheDocument();
  });

  it("surfaces a server error and keeps the form open for retry", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: false, status: 400, body: { error: "Run an audit first" } }));
    const user = userEvent.setup();

    render(<ConsultationForm />);
    await user.type(screen.getByLabelText("Your name"), "Jane");
    await user.type(screen.getByLabelText("Email address"), "jane@acme.com");
    await user.click(screen.getByRole("button", { name: /Request a consultation/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Run an audit first");
    expect(screen.getByLabelText("Your name")).toBeInTheDocument();
  });
});
