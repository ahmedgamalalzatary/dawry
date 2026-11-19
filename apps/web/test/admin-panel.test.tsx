import type { AdminRestaurant } from "@dawry/shared";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminRestaurants } from "@/components/admin/admin-restaurants";
import { mockFetch, renderWithIntl } from "./helpers/render";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

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

describe("AdminRestaurants", () => {
  it("lists restaurants with owner and counts", () => {
    renderWithIntl(<AdminRestaurants initial={[pizza]} />);
    const row = screen.getByRole("row", { name: /Pizza X/ });
    expect(within(row).getByText("01012345678")).toBeInTheDocument();
    expect(within(row).getByText("5")).toBeInTheDocument();
  });

  it("creates a restaurant", async () => {
    const api = mockFetch(
      { status: 201, body: { id: "r2", name: "Burger Y", slug: "burger-y", active: true } },
      { body: [pizza, { ...pizza, id: "r2", name: "Burger Y", slug: "burger-y", ordersToday: 0 }] },
    );
    const user = userEvent.setup();
    renderWithIntl(<AdminRestaurants initial={[pizza]} />);

    await user.type(screen.getByLabelText("Restaurant name"), "Burger Y");
    await user.type(screen.getByLabelText(/Restaurant link/), "burger-y");
    await user.type(screen.getByLabelText("Owner name"), "Ali");
    await user.type(screen.getByLabelText(/Owner phone/), "01111111111");
    await user.type(screen.getByLabelText("Owner password"), "owner-pass-1");
    await user.click(screen.getByRole("button", { name: "Add restaurant" }));

    expect(api.bodyOf(0)).toEqual({
      name: "Burger Y",
      slug: "burger-y",
      ownerName: "Ali",
      ownerPhone: "01111111111",
      ownerPassword: "owner-pass-1",
    });
    expect(await screen.findByRole("row", { name: /Burger Y/ })).toBeInTheDocument();
  });

  it("shows the API's reason when creation is refused", async () => {
    mockFetch({ status: 409, body: { error: { code: "conflict", message: "This restaurant link is already taken" } } });
    const user = userEvent.setup();
    renderWithIntl(<AdminRestaurants initial={[]} />);

    await user.type(screen.getByLabelText("Restaurant name"), "Pizza X");
    await user.type(screen.getByLabelText(/Restaurant link/), "pizza-x");
    await user.type(screen.getByLabelText("Owner name"), "Ali");
    await user.type(screen.getByLabelText(/Owner phone/), "01111111111");
    await user.type(screen.getByLabelText("Owner password"), "owner-pass-1");
    await user.click(screen.getByRole("button", { name: "Add restaurant" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("already taken");
  });

  it("suspends an active restaurant", async () => {
    const api = mockFetch({ body: { id: "r1", active: false } });
    const user = userEvent.setup();
    renderWithIntl(<AdminRestaurants initial={[pizza]} />);

    await user.click(screen.getByRole("button", { name: "Suspend" }));

    expect(api.calls[0]?.url).toBe("/api/admin/restaurants/r1");
    expect(api.bodyOf(0)).toEqual({ active: false });
    expect(await screen.findByRole("button", { name: "Activate" })).toBeInTheDocument();
  });
});
