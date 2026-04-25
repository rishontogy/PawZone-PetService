import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ordersTable } from "./orders";

export const orderTimelineTable = pgTable("order_timeline", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  status: text("status").notNull(),
  note: text("note"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderTimelineSchema = createInsertSchema(orderTimelineTable).omit({ id: true });
export type InsertOrderTimeline = z.infer<typeof insertOrderTimelineSchema>;
export type OrderTimeline = typeof orderTimelineTable.$inferSelect;
