import { pgTable, serial, integer, text, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ordersTable } from "./orders";
import { listingsTable } from "./listings";

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  listingId: integer("listing_id").notNull().references(() => listingsTable.id),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  subtotal: real("subtotal").notNull(),
  gender: text("gender").$type<"male" | "female" | "pair">(),
});

export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({ id: true });
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItemsTable.$inferSelect;
