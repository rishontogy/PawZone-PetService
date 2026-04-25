import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { ordersTable } from "./orders";

export const disputesTable = pgTable("disputes", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  reportedBy: integer("reported_by").notNull().references(() => usersTable.id),
  issueType: text("issue_type").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open")
    .$type<"open" | "in_review" | "resolved" | "closed">(),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDisputeSchema = createInsertSchema(disputesTable).omit({ id: true, createdAt: true });
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputesTable.$inferSelect;
