import {
  pgTable,
  text,
  serial,
  integer,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";
import { customersTable } from "./customers";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customersTable.id, { onDelete: "set null" }),
  customerName: text("customer_name").notNull(), // "Last First Middle", kept for display
  lastName: text("last_name"),
  firstName: text("first_name"),
  middleName: text("middle_name"),
  email: text("email"),
  phone: text("phone").notNull(),
  contactMethod: text("contact_method").notNull(),
  comment: text("comment"),
  city: text("city"),
  novaPoshtaBranch: text("nova_poshta_branch"),
  npCityRef: text("np_city_ref"),
  npWarehouseRef: text("np_warehouse_ref"),
  status: text("status").notNull().default("new"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  liqpayOrderId: text("liqpay_order_id"),
  customerToken: text("customer_token").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => ordersTable.id),
  // Nullable so products can be deleted; the item keeps its name/price snapshot.
  productId: integer("product_id").references(() => productsTable.id, {
    onDelete: "set null",
  }),
  productName: text("product_name").notNull(),
  variant: text("variant"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  imageUrl: text("image_url"),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
