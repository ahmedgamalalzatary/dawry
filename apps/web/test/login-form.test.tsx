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

async function submit(username: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Phone number or username"), username);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginForm", () => {
  it.each([
    ["owner", "/dashboard"],
    ["staff", "/dashboard"],
    ["admin", "/admin"],
    ["customer", "/me"],
  ])("signs a %s in and goes to %s", async (kind, path) => {
    const api = mockFetch({ body: { ok: true } }, { body: { kind } });
    renderWithIntl(<LoginForm />);

    await submit("01012345678", "secret-123");

    expect(api.calls[0]?.url).toBe("/api/auth/sign-in/username");
    expect(api.bodyOf(0)).toEqual({ username: "01012345678", password: "secret-123" });
    expect(router.replace).toHaveBeenCalledWith(path);
  });

  it("shows an error for wrong credentials and stays on the page", async () => {
    mockFetch({ status: 401, body: { code: "INVALID_USERNAME_OR_PASSWORD" } });
    renderWithIntl(<LoginForm />);

    await submit("nobody", "wrong-pass");

    expect(screen.getByRole("alert")).toHaveTextContent("Wrong phone/username or password");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("strips spaces and dashes from a phone number", async () => {
    const api = mockFetch({ body: {} }, { body: { kind: "owner" } });
    renderWithIntl(<LoginForm />);

    await submit("010 1234-5678", "secret-123");

    expect(api.bodyOf(0).username).toBe("01012345678");
  });
});
