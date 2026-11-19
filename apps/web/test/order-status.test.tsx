import type { PublicOrder } from "@dawry/shared";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrderStatusView } from "@/components/customer/order-status-view";
import { renderWithIntl } from "./helpers/render";

const now = new Date("2026-11-19T18:00:00Z");

const base: PublicOrder = {
  restaurant: { slug: "pizza-x", name: "Pizza X", logoUrl: null, phone: "0212345678" },
  invoiceNumber: "42",
  businessDay: "2026-11-19",
  status: "preparing",
  etaMode: "countdown",
  etaAt: "2026-11-19T18:35:30Z",
  late: false,
  ordersAhead: 2,
  items: [{ name: "Margherita", quantity: 2 }],
  fields: [{ label: "Table", value: "7" }],
  createdAt: "2026-11-19T17:50:00Z",
  updatedAt: "2026-11-19T17:50:00Z",
};

const show = (order: Partial<PublicOrder>) =>
  renderWithIntl(<OrderStatusView order={{ ...base, ...order }} now={now} />);

describe("OrderStatusView", () => {
  it("shows the restaurant, invoice, queue and countdown while preparing", () => {
    show({});
    expect(screen.getByRole("heading", { name: "Invoice #42" })).toBeInTheDocument();
    expect(screen.getByText("Pizza X")).toBeInTheDocument();
    expect(screen.getByText("2 orders ahead of you")).toBeInTheDocument();
    expect(screen.getByText("Ready in 35:30")).toBeInTheDocument();
  });

  it("says nobody is ahead when the queue is empty", () => {
    show({ ordersAhead: 0 });
    expect(screen.getByText("Nobody is ahead of you")).toBeInTheDocument();
  });

  it("shows about-N-minutes for the minutes mode", () => {
    show({ etaMode: "minutes" });
    expect(screen.getByText("About 36 min")).toBeInTheDocument();
    expect(screen.queryByText(/Ready in/)).not.toBeInTheDocument();
  });

  it("marks the current step", () => {
    show({ status: "out_for_delivery" });
    const steps = screen.getByRole("list", { name: "Status" });
    expect(within(steps).getByText("Out for delivery").closest("li")).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.getByText("Your order is on its way")).toBeInTheDocument();
    expect(screen.queryByText(/ahead of you/)).not.toBeInTheDocument();
  });

  it("warns when the order is running late and shows the expected time, not a 0:00 countdown", () => {
    show({ late: true, etaAt: "2026-11-19T17:55:00Z" });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your order is taking a bit longer than expected",
    );
    expect(screen.queryByText(/Ready in/)).not.toBeInTheDocument();
    expect(screen.getByText("Expected at 19:55")).toBeInTheDocument();
  });

  it("explains a cancelled order and hides the ETA", () => {
    show({ status: "cancelled" });
    expect(screen.getByText(/This order was cancelled/)).toBeInTheDocument();
    expect(screen.queryByText(/Ready in/)).not.toBeInTheDocument();
  });

  it("lists items and public fields", () => {
    show({});
    expect(screen.getByText("Margherita")).toBeInTheDocument();
    expect(screen.getByText("× 2")).toBeInTheDocument();
    expect(screen.getByText("Table")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("offers a call link when the restaurant has a phone", () => {
    show({});
    expect(screen.getByRole("link", { name: "Call the restaurant" })).toHaveAttribute(
      "href",
      "tel:0212345678",
    );
  });
});
