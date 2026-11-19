import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/auth/login-form";
import { mockFetch, renderWithIntl } from "./helpers/render";

const router = { replace: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

beforeEach(() => {
  router.replace.mockReset();
  router.refresh.mockReset();
});

async function submit(label: string, username: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(label), username);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginForm", () => {
  it.each([
    ["customer", "Phone number", "01012345678", "/me"],
    ["owner", "Phone number", "01012345678", "/dashboard"],
    ["staff", "Username", "mona", "/dashboard"],
    ["admin", "Username", "admin", "/admin"],
  ] as const)("signs a %s in on their own page", async (portal, label, username, path) => {
    const api = mockFetch({ body: { ok: true } }, { body: { kind: portal } });
    renderWithIntl(<LoginForm portal={portal} />);

    await submit(label, username, "secret-123");

    expect(api.calls[0]?.url).toBe("/api/auth/sign-in/username");
    expect(api.bodyOf(0)).toEqual({ username, password: "secret-123" });
    expect(router.replace).toHaveBeenCalledWith(path);
  });

  it.each([
    ["customer", "owner"],
    ["owner", "staff"],
    ["staff", "owner"],
    ["admin", "customer"],
  ] as const)("refuses a %s page for a %s account and signs it out", async (portal, kind) => {
    const api = mockFetch({ body: { ok: true } }, { body: { kind } }, { body: {} });
    renderWithIntl(<LoginForm portal={portal} />);

    await submit(portal === "staff" || portal === "admin" ? "Username" : "Phone number", "someone", "secret-123");

    expect(api.calls[2]?.url).toBe("/api/auth/sign-out");
    expect(screen.getByRole("alert")).toHaveTextContent("This account can't sign in here");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("shows an error for wrong credentials and stays on the page", async () => {
    mockFetch({ status: 401, body: { code: "INVALID_USERNAME_OR_PASSWORD" } });
    renderWithIntl(<LoginForm portal="staff" />);

    await submit("Username", "nobody", "wrong-pass");

    expect(screen.getByRole("alert")).toHaveTextContent("Wrong username or password");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("strips spaces and dashes from a phone number", async () => {
    const api = mockFetch({ body: {} }, { body: { kind: "owner" } });
    renderWithIntl(<LoginForm portal="owner" />);

    await submit("Phone number", "010 1234-5678", "secret-123");

    expect(api.bodyOf(0).username).toBe("01012345678");
  });
});
