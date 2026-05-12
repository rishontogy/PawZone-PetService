import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const payoutTransactionsTable = pgTable("payout_transactions", {
  id: serial("id").primaryKey(),
  recipientId: integer("recipient_id").notNull().references(() => usersTable.id),
  adminId: integer("admin_id").notNull().references(() => usersTable.id),
  amount: real("amount").notNull(),
  referenceNumber: text("reference_number").notNull(),
  screenshotUrl: text("screenshot_url").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPayoutTransactionSchema = createInsertSchema(payoutTransactionsTable).omit({ id: true, createdAt: true });
export type InsertPayoutTransaction = z.infer<typeof insertPayoutTransactionSchema>;
export type PayoutTransaction = typeof payoutTransactionsTable.$inferSelect;
