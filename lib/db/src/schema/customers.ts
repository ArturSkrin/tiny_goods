import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { productsTable } from "./products";

/** Storefront buyer account. Sign-in is passwordless: email code, Google or Telegram. */
export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  email: text("email").unique(), // lower-cased; null for Telegram-only accounts
  googleSub: text("google_sub").unique(),
  telegramId: text("telegram_id").unique(),
  lastName: text("last_name"),
  firstName: text("first_name"),
  middleName: text("middle_name"),
  phone: text("phone"),
  contactMethod: text("contact_method"),
  // Bumped to invalidate every session of this customer (logout everywhere, account deletion).
  tokenVersion: integer("token_version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customerAddressesTable = pgTable("customer_addresses", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  city: text("city").notNull(),
  npCityRef: text("np_city_ref").notNull(),
  branch: text("branch").notNull(),
  npWarehouseRef: text("np_warehouse_ref").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One-time email sign-in codes (only a hash is stored). */
export const loginCodesTable = pgTable(
  "login_codes",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("login_codes_email_idx").on(t.email)],
);

export const customerViewedTable = pgTable(
  "customer_viewed",
  {
    customerId: integer("customer_id")
      .notNull()
      .references(() => customersTable.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.customerId, t.productId] })],
);

export type Customer = typeof customersTable.$inferSelect;
export type CustomerAddress = typeof customerAddressesTable.$inferSelect;
