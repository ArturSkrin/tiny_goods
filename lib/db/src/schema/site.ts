import {
  pgTable,
  serial,
  integer,
  text,
  jsonb,
  timestamp,
  customType,
} from "drizzle-orm/pg-core";

/** Singleton row (id = 1) with the admin-editable storefront settings as JSON. */
export const siteSettingsTable = pgTable("site_settings", {
  id: integer("id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

/** Images uploaded from the admin panel, served at /api/images/:id. */
export const imagesTable = pgTable("images", {
  id: serial("id").primaryKey(),
  mime: text("mime").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
