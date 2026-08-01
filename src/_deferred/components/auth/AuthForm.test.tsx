import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthForm from "@/components/auth/AuthForm";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => new URLSearchParams(""),
}));

const signInWithPassword = vi.fn();
const signUp = vi.fn();
const resetPasswordForEmail = vi.fn();
const updateUser = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signInWithPassword, signUp, resetPasswordForEmail, updateUser },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuthForm — login", () => {
  it("signs in and redirects to the dashboard", async () => {
    signInWithPassword.mockResolvedValue({ data: {}, error: null });
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);

    await user.type(screen.getByLabelText("Email address"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "hunter2222");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({ email: "a@b.com", password: "hunter2222" });
    });
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("translates Supabase's credential error into plain language", async () => {
    signInWithPassword.mockResolvedValue({ error: new Error("Invalid login credentials") });
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);

    await user.type(screen.getByLabelText("Email address"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That email and password don't match.");
    expect(push).not.toHaveBeenCalled();
  });

  it("offers forgot-password and registration links", () => {
    render(<AuthForm mode="login" />);
    expect(screen.getByRole("link", { name: "Forgot your password?" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.getByRole("link", { name: "Create one" })).toHaveAttribute("href", "/register");
  });
});

describe("AuthForm — register", () => {
  it("signs up and asks the user to confirm when no session is returned", async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: null });
    const user = userEvent.setup();
    render(<AuthForm mode="register" />);

    await user.type(screen.getByLabelText("Your name"), "Jane");
    await user.type(screen.getByLabelText("Email address"), "jane@co.com");
    await user.type(screen.getByLabelText("Password"), "longenough1");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("status")).toHaveTextContent(/Check your email/);
    expect(push).not.toHaveBeenCalled();
  });

  it("redirects immediately when signup returns a session", async () => {
    signUp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });
    const user = userEvent.setup();
    render(<AuthForm mode="register" />);

    await user.type(screen.getByLabelText("Email address"), "jane@co.com");
    await user.type(screen.getByLabelText("Password"), "longenough1");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("rejects a short password before calling Supabase", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="register" />);

    await user.type(screen.getByLabelText("Email address"), "jane@co.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/at least 8 characters/i);
    expect(signUp).not.toHaveBeenCalled();
  });

  it("never sends a role — privilege escalation is not reachable from signup", async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: null });
    const user = userEvent.setup();
    render(<AuthForm mode="register" />);

    await user.type(screen.getByLabelText("Email address"), "jane@co.com");
    await user.type(screen.getByLabelText("Password"), "longenough1");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(signUp).toHaveBeenCalled());
    const payload = JSON.stringify(signUp.mock.calls[0][0]);
    expect(payload.toLowerCase()).not.toContain("role");
  });

  it("explains that an existing account should sign in instead", async () => {
    signUp.mockResolvedValue({ error: new Error("User already registered") });
    const user = userEvent.setup();
    render(<AuthForm mode="register" />);

    await user.type(screen.getByLabelText("Email address"), "jane@co.com");
    await user.type(screen.getByLabelText("Password"), "longenough1");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/already exists/i);
  });
});

describe("AuthForm — forgot password", () => {
  it("does not reveal whether the address is registered", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<AuthForm mode="forgot" />);

    await user.type(screen.getByLabelText("Email address"), "nobody@nowhere.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("status")).toHaveTextContent(/If an account exists/);
  });

  it("asks for no password field", () => {
    render(<AuthForm mode="forgot" />);
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });
});

describe("AuthForm — reset password", () => {
  it("updates the password and redirects", async () => {
    updateUser.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<AuthForm mode="reset" />);

    await user.type(screen.getByLabelText("New password"), "brandnewpass");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ password: "brandnewpass" }));
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("asks for no email field", () => {
    render(<AuthForm mode="reset" />);
    expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
  });
});
