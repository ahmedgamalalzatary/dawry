import { describe, expect, it } from "vitest";
import {
  createOrderSchema,
  createRestaurantSchema,
  createStaffSchema,
  customerSignUpSchema,
  etaInputSchema,
  normalizePhone,
  restaurantSettingsSchema,
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

  it.each(["staff", "admin"])("rejects the reserved slug %s (used by sign-in pages)", (slug) => {
    expect(createRestaurantSchema.safeParse({ ...valid, slug }).success).toBe(false);
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

describe("restaurantSettingsSchema logoUrl", () => {
  const parse = (logoUrl: string) => restaurantSettingsSchema.safeParse({ name: "Roma", logoUrl }).success;

  it("accepts an https URL, an uploaded logo path, or nothing", () => {
    expect(parse("https://example.com/logo.png")).toBe(true);
    expect(parse("/api/public/logos/3f2b6c1e-8a4d-4e7a-9b1c-2d3e4f5a6b7c?v=1732000000000")).toBe(true);
    expect(parse("")).toBe(true);
  });

  it("rejects other paths and schemes", () => {
    expect(parse("/api/public/logos/../../etc?v=1")).toBe(false);
    expect(parse("/somewhere/else.png")).toBe(false);
    expect(parse("javascript:alert(1)")).toBe(false);
  });
});
