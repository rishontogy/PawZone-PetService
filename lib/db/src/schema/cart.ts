import { pgTable, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { listingsTable } from "./listings";

export const cartTable = pgTable("cart", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  listingId: integer("listing_id").notNull().references(() => listingsTable.id),
  quantity: integer("quantity").notNull().default(1),
});

export const insertCartSchema = createInsertSchema(cartTable).omit({ id: true });
export type InsertCart = z.infer<typeof insertCartSchema>;
export type Cart = typeof cartTable.$inferSelect;
