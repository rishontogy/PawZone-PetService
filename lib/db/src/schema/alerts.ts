import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { ordersTable } from "./orders";

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().$type<
    | "SELLER_DELAY"
    | "PAYMENT_DELAY"
    | "TRANSPORT_DELAY"
    | "DELIVERY_DELAY"
    | "CANCELLATION"
    | "FRAUD"
    | "REPORT"
    | "REFUND"
  >(),
  message: text("message").notNull(),
  priority: text("priority").notNull().default("MEDIUM").$type<"HIGH" | "MEDIUM" | "LOW">(),
  status: text("status").notNull().default("ACTIVE").$type<"ACTIVE" | "RESOLVED">(),
  userId: integer("user_id").references(() => usersTable.id),
  orderId: integer("order_id").references(() => ordersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export type Alert = typeof alertsTable.$inferSelect;
