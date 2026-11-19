import type { CustomField, MenuItem } from "@dawry/shared";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NewOrderForm } from "@/components/dashboard/new-order-form";
import { mockFetch, renderWithIntl } from "./helpers/render";

const menu: MenuItem[] = [
  { id: "m1", name: "Margherita", active: true },
  { id: "m2", name: "Old pizza", active: false },
];
const fields: CustomField[] = [
  { id: "f1", label: "Table", required: true, public: true, active: true },
  { id: "f2", label: "Retired", required: false, public: false, active: false },
];

function setup() {
  const onCreated = vi.fn();
  renderWithIntl(<NewOrderForm menu={menu} fields={fields} onCreated={onCreated} />);
  return { user: userEvent.setup(), onCreated };
}

describe("NewOrderForm", () => {
  it("offers only active menu items and active custom fields", () => {
    setup();
    expect(screen.getByRole("option", { name: "Margherita" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Old pizza" })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Table/)).toBeRequired();
    expect(screen.queryByLabelText(/Retired/)).not.toBeInTheDocument();
  });

  it("submits a menu item, a free-text item, fields and a countdown ETA", async () => {
    const api = mockFetch({ status: 201, body: { id: "o1", invoiceNumber: "42" } });
    const { user, onCreated } = setup();

    await user.type(screen.getByLabelText("Invoice number"), "42");
    await user.selectOptions(screen.getByLabelText("From the menu"), "m1");
    await user.click(screen.getByRole("button", { name: "Add item" }));
    await user.type(screen.getAllByLabelText("Item name")[1]!, "Cola");
    await user.clear(screen.getAllByLabelText("Quantity")[1]!);
    await user.type(screen.getAllByLabelText("Quantity")[1]!, "3");
    await user.type(screen.getByLabelText(/Table/), "7");
    await user.type(screen.getByLabelText("Minutes"), "25");
    await user.click(screen.getByRole("button", { name: "Add order" }));

    expect(api.calls[0]?.url).toBe("/api/restaurant/orders");
    expect(api.bodyOf(0)).toEqual({
      invoiceNumber: "42",
      items: [
        { menuItemId: "m1", name: "Margherita", quantity: 1 },
        { name: "Cola", quantity: 3 },
      ],
      fields: [{ fieldId: "f1", value: "7" }],
      eta: { mode: "countdown", minutes: 25 },
      customerName: "",
      customerPhone: "",
      address: "",
      notes: "",
    });
    expect(onCreated).toHaveBeenCalled();
  });

  it("sends a clock time when that mode is chosen", async () => {
    const api = mockFetch({ status: 201, body: {} });
    const { user } = setup();

    await user.type(screen.getByLabelText("Invoice number"), "7");
    await user.type(screen.getAllByLabelText("Item name")[0]!, "Burger");
    await user.type(screen.getByLabelText(/Table/), "1");
    await user.click(screen.getByRole("radio", { name: "Clock time" }));
    await user.type(screen.getByLabelText("Time"), "21:15");
    await user.click(screen.getByRole("button", { name: "Add order" }));

    expect(api.bodyOf(0).eta).toEqual({ mode: "clock", time: "21:15" });
  });

  it("shows a clear message when the invoice number is already used", async () => {
    mockFetch({ status: 409, body: { error: { code: "conflict", message: "dup" } } });
    const { user, onCreated } = setup();

    await user.type(screen.getByLabelText("Invoice number"), "42");
    await user.type(screen.getAllByLabelText("Item name")[0]!, "Burger");
    await user.type(screen.getByLabelText(/Table/), "1");
    await user.type(screen.getByLabelText("Minutes"), "10");
    await user.click(screen.getByRole("button", { name: "Add order" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This invoice number is already used today",
    );
    expect(onCreated).not.toHaveBeenCalled();
  });
});
