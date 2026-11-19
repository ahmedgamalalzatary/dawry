import { describe, expect, it } from "vitest";
import {
  createOrderSchema,
  createRestaurantSchema,
  createStaffSchema,
  customerSignUpSchema,
  etaInputSchema,
  normalizePhone,
} from "../src/schemas";

describe("normalizePhone", () => {
  it("keeps digits only", () => {
    expect(normalizePhone("+20 101-234 5678")).toBe("201012345678");
    expect(normalizePhone("01012345678")).toBe("01012345678");
  });
});

describe("createRestaurantSchema", () => {
  const valid = {
    name: "Pizza X",
    slug: "pizza-x",
    ownerName: "Ahmed",
    ownerPhone: "010 1234 5678",
    ownerPassword: "secret-123",
  };

  it("accepts a valid restaurant and normalizes the owner phone", () => {
    const parsed = createRestaurantSchema.parse(valid);
    expect(parsed.ownerPhone).toBe("01012345678");
  });

  it("rejects slugs with spaces or capitals", () => {
    expect(createRestaurantSchema.safeParse({ ...valid, slug: "Pizza X" }).success).toBe(false);
  });

  it("rejects phones that are too short", () => {
    expect(createRestaurantSchema.safeParse({ ...valid, ownerPhone: "123" }).success).toBe(false);
  });

  it("rejects passwords under 8 characters", () => {
    expect(createRestaurantSchema.safeParse({ ...valid, ownerPassword: "short" }).success).toBe(
      false,
    );
  });
});

describe("createStaffSchema", () => {
  it("accepts a simple username and lowercases it", () => {
    const parsed = createStaffSchema.parse({
      name: "Cashier",
      username: "Cashier_1",
      password: "secret-123",
    });
    expect(parsed.username).toBe("cashier_1");
  });

  it("rejects usernames that are only digits (reserved for owner phones)", () => {
    expect(
      createStaffSchema.safeParse({ name: "x", username: "0101234", password: "secret-123" })
        .success,
    ).toBe(false);
  });
});

describe("etaInputSchema", () => {
  it("accepts each mode with its own field", () => {
    expect(etaInputSchema.safeParse({ mode: "countdown", minutes: 30 }).success).toBe(true);
    expect(etaInputSchema.safeParse({ mode: "minutes", minutes: 30 }).success).toBe(true);
    expect(etaInputSchema.safeParse({ mode: "clock", time: "21:15" }).success).toBe(true);
  });

  it("rejects bad minutes and bad clock times", () => {
    expect(etaInputSchema.safeParse({ mode: "countdown", minutes: 0 }).success).toBe(false);
    expect(etaInputSchema.safeParse({ mode: "minutes", minutes: 1000 }).success).toBe(false);
    expect(etaInputSchema.safeParse({ mode: "clock", time: "25:00" }).success).toBe(false);
  });
});

describe("createOrderSchema", () => {
  const valid = {
    invoiceNumber: " 42 ",
    eta: { mode: "countdown", minutes: 25 },
    items: [{ name: "Margherita", quantity: 2 }],
  };

  it("trims the invoice number and fills defaults", () => {
    const parsed = createOrderSchema.parse(valid);
    expect(parsed.invoiceNumber).toBe("42");
    expect(parsed.fields).toEqual([]);
  });

  it("needs at least one item", () => {
    expect(createOrderSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
  });

  it("rejects quantities below 1", () => {
    expect(
      createOrderSchema.safeParse({ ...valid, items: [{ name: "x", quantity: 0 }] }).success,
    ).toBe(false);
  });
});

describe("customerSignUpSchema", () => {
  it("normalizes the phone", () => {
    const parsed = customerSignUpSchema.parse({
      name: "Sara",
      phone: "+20 100 000 0000",
      password: "secret-123",
    });
    expect(parsed.phone).toBe("201000000000");
  });

  it("requires a name", () => {
    expect(
      customerSignUpSchema.safeParse({ name: " ", phone: "01000000000", password: "secret-123" })
        .success,
    ).toBe(false);
  });
});
