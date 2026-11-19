import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffManager } from "@/components/dashboard/staff-manager";
import { resetUrl } from "./helpers/navigation";
import { mockFetch, renderWithIntl } from "./helpers/render";

vi.mock("next/navigation", () => import("./helpers/navigation"));

const existing = [{ id: "u1", name: "Mona", username: "mona1", createdAt: "2026-11-19T10:00:00Z" }];

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, username: string) {
  await user.click(screen.getByRole("button", { name: "Add staff member" }));
  const sheet = await screen.findByRole("dialog");
  await user.type(within(sheet).getByLabelText("Name"), "Ali");
  await user.type(within(sheet).getByLabelText("Username"), username);
  await user.type(within(sheet).getByLabelText("Password"), "secret-123");
  await user.click(within(sheet).getByRole("button", { name: "Add staff member" }));
}

describe("StaffManager", () => {
  beforeEach(() => resetUrl("/dashboard/staff"));

  it("lists staff and shows an empty state", () => {
    const { unmount } = renderWithIntl(<StaffManager initial={existing} />);
    expect(screen.getAllByText("mona1").length).toBeGreaterThan(0);
    unmount();

    renderWithIntl(<StaffManager initial={[]} />);
    expect(screen.getByText("No staff yet")).toBeInTheDocument();
  });

  it("finds staff by name or username", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <StaffManager initial={[...existing, { id: "u2", name: "Karim", username: "karim2", createdAt: "2026-11-18T10:00:00Z" }]} />,
    );

    await user.type(screen.getByRole("searchbox"), "kar{Enter}");

    expect((await screen.findAllByText("karim2")).length).toBeGreaterThan(0);
    expect(screen.queryAllByText("mona1")).toHaveLength(0);
  });

  it("adds a staff member", async () => {
    const api = mockFetch({ status: 201, body: { id: "u2", name: "Ali", username: "ali_2" } });
    const user = userEvent.setup();
    renderWithIntl(<StaffManager initial={existing} />);

    await fillAndSubmit(user, "ali_2");

    expect(api.calls[0]?.url).toBe("/api/restaurant/staff");
    expect(api.bodyOf(0)).toEqual({ name: "Ali", username: "ali_2", password: "secret-123" });
    expect((await screen.findAllByText("ali_2")).length).toBeGreaterThan(0);
  });

  it("shows why a username was refused", async () => {
    mockFetch({
      status: 409,
      body: { error: { code: "conflict", message: "This phone number or username is already registered" } },
    });
    const user = userEvent.setup();
    renderWithIntl(<StaffManager initial={existing} />);

    await fillAndSubmit(user, "mona1");

    expect(await screen.findByRole("alert")).toHaveTextContent("already registered");
  });

  it("removes a staff member", async () => {
    const api = mockFetch({ status: 204 });
    const user = userEvent.setup();
    renderWithIntl(<StaffManager initial={existing} />);

    await user.click(screen.getByRole("button", { name: "Actions: mona1" }));
    await user.click(await screen.findByRole("menuitem", { name: "Remove mona1" }));

    expect(api.calls[0]).toMatchObject({ url: "/api/restaurant/staff/u1" });
    expect(api.calls[0]?.init?.method).toBe("DELETE");
    expect(screen.queryAllByText("mona1")).toHaveLength(0);
  });
});
