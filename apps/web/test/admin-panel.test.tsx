import type { AdminRestaurant } from "@dawry/shared";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRestaurants } from "@/components/admin/admin-restaurants";
import { resetUrl } from "./helpers/navigation";
import { mockFetch, renderWithIntl } from "./helpers/render";

vi.mock("next/navigation", () => import("./helpers/navigation"));

const pizza: AdminRestaurant = {
  id: "r1",
  name: "Pizza X",
  slug: "pizza-x",
  active: true,
  owner: { id: "u1", name: "Mona", phone: "01012345678" },
  staffCount: 2,
  ordersToday: 5,
  createdAt: "2026-11-01T10:00:00Z",
};

const rowOf = (name: string) => screen.getByRole("link", { name }).closest("li")!;

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole("button", { name: "Add restaurant" })[0]!);
  const sheet = await screen.findByRole("dialog");
  await user.type(within(sheet).getByLabelText("Restaurant name"), "Burger Y");
  await user.type(within(sheet).getByLabelText(/Restaurant link/), "burger-y");
  await user.type(within(sheet).getByLabelText("Owner name"), "Ali");
  await user.type(within(sheet).getByLabelText(/Owner phone/), "01111111111");
  await user.type(within(sheet).getByLabelText("Owner password"), "owner-pass-1");
  await user.click(within(sheet).getByRole("button", { name: "Add restaurant" }));
}

describe("AdminRestaurants", () => {
  beforeEach(() => resetUrl("/admin/restaurants"));

  it("lists restaurants with owner and counts, each opening its page", () => {
    renderWithIntl(<AdminRestaurants initial={[pizza]} title="Restaurants" description="" />);
    expect(screen.getByRole("link", { name: "Pizza X" })).toHaveAttribute("href", "/admin/restaurants/r1");
    const row = rowOf("Pizza X");
    expect(within(row).getByText("01012345678")).toBeInTheDocument();
    expect(row).toHaveTextContent(/Orders today\s*5/);
  });

  it("creates a restaurant", async () => {
    const api = mockFetch(
      { status: 201, body: { id: "r2", name: "Burger Y", slug: "burger-y", active: true } },
      { body: [pizza, { ...pizza, id: "r2", name: "Burger Y", slug: "burger-y", ordersToday: 0 }] },
    );
    const user = userEvent.setup();
    renderWithIntl(<AdminRestaurants initial={[pizza]} title="Restaurants" description="" />);

    await fillAndSubmit(user);

    expect(api.bodyOf(0)).toEqual({
      name: "Burger Y",
      slug: "burger-y",
      ownerName: "Ali",
      ownerPhone: "01111111111",
      ownerPassword: "owner-pass-1",
    });
    expect(await screen.findByRole("link", { name: "Burger Y" })).toBeInTheDocument();
  });

  it("shows the API's reason when creation is refused", async () => {
    mockFetch({ status: 409, body: { error: { code: "conflict", message: "This restaurant link is already taken" } } });
    const user = userEvent.setup();
    renderWithIntl(<AdminRestaurants initial={[]} title="Restaurants" description="" />);

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("already taken");
  });

  it("suspends an active restaurant", async () => {
    const api = mockFetch({ body: { id: "r1", active: false } });
    const user = userEvent.setup();
    renderWithIntl(<AdminRestaurants initial={[pizza]} title="Restaurants" description="" />);

    await user.click(screen.getAllByRole("button", { name: "Actions: Pizza X" })[0]!);
    await user.click(await screen.findByRole("menuitem", { name: "Suspend" }));

    expect(api.calls[0]?.url).toBe("/api/admin/restaurants/r1");
    expect(api.bodyOf(0)).toEqual({ active: false });
    await user.click(screen.getAllByRole("button", { name: "Actions: Pizza X" })[0]!);
    expect(await screen.findByRole("menuitem", { name: "Activate" })).toBeInTheDocument();
  });
});
