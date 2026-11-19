import { z } from "zod";

export const ORDER_STATUSES = [
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ETA_MODES = ["countdown", "clock", "minutes"] as const;
export type EtaMode = (typeof ETA_MODES)[number];

export const LIMITS = {
  name: 100,
  text: 500,
  invoice: 32,
  items: 100,
  fields: 30,
  etaMinutes: 600,
} as const;

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

const text = (max: number = LIMITS.text) => z.string().trim().max(max);
const requiredText = (max: number = LIMITS.name) => z.string().trim().min(1).max(max);

export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .pipe(z.string().min(8).max(15));

export const passwordSchema = z.string().min(8).max(128);

export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/** Staff usernames need a letter so they never collide with phone-number usernames. */
export const staffUsernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9_.]+$/)
  .regex(/[a-z]/);

// ---- auth / accounts -------------------------------------------------------

export const signInSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(128),
});

export const customerSignUpSchema = z.object({
  name: requiredText(),
  phone: phoneSchema,
  password: passwordSchema,
});

// ---- super-admin -----------------------------------------------------------

export const createRestaurantSchema = z.object({
  name: requiredText(),
  slug: slugSchema,
  ownerName: requiredText(),
  ownerPhone: phoneSchema,
  ownerPassword: passwordSchema,
});

export const setRestaurantActiveSchema = z.object({ active: z.boolean() });

export const resetPasswordSchema = z.object({ password: passwordSchema });

// ---- owner -----------------------------------------------------------------

export const createStaffSchema = z.object({
  name: requiredText(),
  username: staffUsernameSchema,
  password: passwordSchema,
});

export const menuItemSchema = z.object({
  name: requiredText(),
  active: z.boolean().default(true),
});

export const customFieldSchema = z.object({
  label: requiredText(),
  required: z.boolean().default(false),
  public: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const restaurantSettingsSchema = z.object({
  name: requiredText(),
  phone: z.union([phoneSchema, z.literal("")]).default(""),
  logoUrl: z
    .union([z.url({ protocol: /^https?$/ }).max(LIMITS.text), z.literal("")])
    .default(""),
});

// ---- orders ----------------------------------------------------------------

export const etaInputSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("countdown"), minutes: z.int().min(1).max(LIMITS.etaMinutes) }),
  z.object({ mode: z.literal("minutes"), minutes: z.int().min(1).max(LIMITS.etaMinutes) }),
  z.object({
    mode: z.literal("clock"),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  }),
]);
export type EtaInput = z.infer<typeof etaInputSchema>;

export const orderItemSchema = z.object({
  menuItemId: z.string().max(36).optional(),
  name: requiredText(),
  quantity: z.int().min(1).max(999),
});

export const orderFieldValueSchema = z.object({
  fieldId: z.string().min(1).max(36),
  value: text(),
});

export const createOrderSchema = z.object({
  invoiceNumber: requiredText(LIMITS.invoice),
  eta: etaInputSchema,
  items: z.array(orderItemSchema).min(1).max(LIMITS.items),
  customerName: text(LIMITS.name).default(""),
  customerPhone: z.union([phoneSchema, z.literal("")]).default(""),
  address: text().default(""),
  notes: text().default(""),
  fields: z.array(orderFieldValueSchema).max(LIMITS.fields).default([]),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({ status: z.enum(ORDER_STATUSES) });

export const updateEtaSchema = z.object({ eta: etaInputSchema });
