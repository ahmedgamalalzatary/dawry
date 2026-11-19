// Drizzle schema (MySQL).
// Auth tables follow Better Auth's schema with the username, admin and
// organization plugins. A restaurant is an `organization`; its owner and
// staff are `member` rows (role "owner" / "member").
import { relations } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  int,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

const id = () => varchar("id", { length: 36 }).primaryKey();
const createdAt = () => timestamp("created_at", { fsp: 3 }).defaultNow().notNull();
const updatedAt = () =>
  timestamp("updated_at", { fsp: 3 })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull();

export const user = mysqlTable("user", {
  id: id(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  // username plugin (owner: phone number, staff: plain username)
  username: varchar("username", { length: 255 }).unique(),
  displayUsername: varchar("display_username", { length: 255 }),
  // admin plugin
  role: varchar("role", { length: 255 }),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires", { fsp: 3 }),
});

export const session = mysqlTable(
  "session",
  {
    id: id(),
    expiresAt: timestamp("expires_at", { fsp: 3 }).notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // admin plugin
    impersonatedBy: text("impersonated_by"),
    // organization plugin
    activeOrganizationId: text("active_organization_id"),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = mysqlTable(
  "account",
  {
    id: id(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { fsp: 3 }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { fsp: 3 }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = mysqlTable(
  "verification",
  {
    id: id(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { fsp: 3 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export const organization = mysqlTable("organization", {
  id: id(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  logo: text("logo"),
  createdAt: createdAt(),
  metadata: text("metadata"),
});

export const member = mysqlTable(
  "member",
  {
    id: id(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 32 }).default("member").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("member_organization_id_idx").on(t.organizationId),
    index("member_user_id_idx").on(t.userId),
  ],
);

export const invitation = mysqlTable(
  "invitation",
  {
    id: id(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    role: varchar("role", { length: 32 }),
    status: varchar("status", { length: 32 }).default("pending").notNull(),
    expiresAt: timestamp("expires_at", { fsp: 3 }).notNull(),
    createdAt: createdAt(),
    inviterId: varchar("inviter_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("invitation_organization_id_idx").on(t.organizationId),
    index("invitation_email_idx").on(t.email),
  ],
);

// ---- Dawry domain ----------------------------------------------------------

const orgId = () =>
  varchar("organization_id", { length: 36 })
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" });

/** One row per restaurant (organization). */
export const restaurantSettings = mysqlTable("restaurant_settings", {
  organizationId: varchar("organization_id", { length: 36 })
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  phone: varchar("phone", { length: 20 }).default("").notNull(),
  logoUrl: varchar("logo_url", { length: 500 }).default("").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

const mediumBlob = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "mediumblob",
});

/** An uploaded restaurant logo (served from /api/public/logos/:id). */
export const restaurantLogo = mysqlTable("restaurant_logo", {
  organizationId: varchar("organization_id", { length: 36 })
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  mime: varchar("mime", { length: 32 }).notNull(),
  data: mediumBlob("data").notNull(),
  updatedAt: updatedAt(),
});

export const menuItem = mysqlTable(
  "menu_item",
  {
    id: id(),
    organizationId: orgId(),
    name: varchar("name", { length: 100 }).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("menu_item_org_idx").on(t.organizationId)],
);

export const customField = mysqlTable(
  "custom_field",
  {
    id: id(),
    organizationId: orgId(),
    label: varchar("label", { length: 100 }).notNull(),
    required: boolean("required").default(false).notNull(),
    public: boolean("public").default(false).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("custom_field_org_idx").on(t.organizationId)],
);

export const orders = mysqlTable(
  "orders",
  {
    id: id(),
    organizationId: orgId(),
    invoiceNumber: varchar("invoice_number", { length: 32 }).notNull(),
    businessDay: varchar("business_day", { length: 10 }).notNull(),
    status: varchar("status", { length: 20 })
      .$type<"preparing" | "out_for_delivery" | "delivered" | "cancelled">()
      .default("preparing")
      .notNull(),
    etaMode: varchar("eta_mode", { length: 10 })
      .$type<"countdown" | "clock" | "minutes">()
      .notNull(),
    etaAt: timestamp("eta_at", { fsp: 3 }).notNull(),
    customerName: varchar("customer_name", { length: 100 }).default("").notNull(),
    customerPhone: varchar("customer_phone", { length: 20 }).default("").notNull(),
    address: varchar("address", { length: 500 }).default("").notNull(),
    notes: varchar("notes", { length: 500 }).default("").notNull(),
    createdById: varchar("created_by_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    outAt: timestamp("out_at", { fsp: 3 }),
    deliveredAt: timestamp("delivered_at", { fsp: 3 }),
    cancelledAt: timestamp("cancelled_at", { fsp: 3 }),
  },
  (t) => [
    uniqueIndex("orders_invoice_per_day_uq").on(t.organizationId, t.businessDay, t.invoiceNumber),
    index("orders_org_day_status_idx").on(t.organizationId, t.businessDay, t.status),
  ],
);

export const orderItem = mysqlTable(
  "order_item",
  {
    id: id(),
    orderId: varchar("order_id", { length: 36 })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    menuItemId: varchar("menu_item_id", { length: 36 }).references(() => menuItem.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 100 }).notNull(),
    quantity: int("quantity").notNull(),
    position: int("position").notNull(),
  },
  (t) => [index("order_item_order_idx").on(t.orderId)],
);

/** Label and visibility are copied from the field when the order is created. */
export const orderFieldValue = mysqlTable(
  "order_field_value",
  {
    id: id(),
    orderId: varchar("order_id", { length: 36 })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fieldId: varchar("field_id", { length: 36 }).references(() => customField.id, {
      onDelete: "set null",
    }),
    label: varchar("label", { length: 100 }).notNull(),
    public: boolean("public").notNull(),
    value: varchar("value", { length: 500 }).notNull(),
    position: int("position").notNull(),
  },
  (t) => [index("order_field_value_order_idx").on(t.orderId)],
);

export const savedOrder = mysqlTable(
  "saved_order",
  {
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    orderId: varchar("order_id", { length: 36 })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.orderId] })],
);

export const favoriteRestaurant = mysqlTable(
  "favorite_restaurant",
  {
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: orgId(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.organizationId] })],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  members: many(member),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  invitations: many(invitation),
}));

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, { fields: [member.userId], references: [user.id] }),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  inviter: one(user, { fields: [invitation.inviterId], references: [user.id] }),
}));
