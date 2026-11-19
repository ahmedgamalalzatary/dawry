import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { StaffManager } from "@/components/dashboard/staff-manager";
import { mockFetch, renderWithIntl } from "./helpers/render";

const existing = [{ id: "u1", name: "Mona", username: "mona1", createdAt: "2026-11-19T10:00:00Z" }];

describe("StaffManager", () => {
  it("lists staff and shows an empty state", () => {
    const { unmount } = renderWithIntl(<StaffManager initial={existing} />);
    expect(screen.getByText("mona1")).toBeInTheDocument();
    unmount();

    renderWithIntl(<StaffManager initial={[]} />);
    expect(screen.getByText("No staff yet")).toBeInTheDocument();
  });

  it("adds a staff member", async () => {
    const api = mockFetch({ status: 201, body: { id: "u2", name: "Ali", username: "ali_2" } });
    const user = userEvent.setup();
    renderWithIntl(<StaffManager initial={[]} />);

    await user.type(screen.getByLabelText("Name"), "Ali");
    await user.type(screen.getByLabelText("Username"), "ali_2");
    await user.type(screen.getByLabelText("Password"), "secret-123");
    await user.click(screen.getByRole("button", { name: "Add staff member" }));

    expect(api.calls[0]?.url).toBe("/api/restaurant/staff");
    expect(api.bodyOf(0)).toEqual({ name: "Ali", username: "ali_2", password: "secret-123" });
    expect(await screen.findByText("ali_2")).toBeInTheDocument();
  });

  it("shows why a username was refused", async () => {
    mockFetch({
      status: 409,
      body: { error: { code: "conflict", message: "This phone number or username is already registered" } },
    });
    const user = userEvent.setup();
    renderWithIntl(<StaffManager initial={[]} />);

    await user.type(screen.getByLabelText("Name"), "Ali");
    await user.type(screen.getByLabelText("Username"), "mona1");
    await user.type(screen.getByLabelText("Password"), "secret-123");
    await user.click(screen.getByRole("button", { name: "Add staff member" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("already registered");
  });

  it("removes a staff member", async () => {
    const api = mockFetch({ status: 204 });
    const user = userEvent.setup();
    renderWithIntl(<StaffManager initial={existing} />);

    await user.click(screen.getByRole("button", { name: "Remove mona1" }));

    expect(api.calls[0]).toMatchObject({ url: "/api/restaurant/staff/u1" });
    expect(api.calls[0]?.init?.method).toBe("DELETE");
    expect(screen.queryByText("mona1")).not.toBeInTheDocument();
  });
});
