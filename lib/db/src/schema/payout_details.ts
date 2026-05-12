import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const payoutDetailsTable = pgTable("payout_details", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id).unique(),
  upiId: text("upi_id"),
  qrCodeUrl: text("qr_code_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPayoutDetailsSchema = createInsertSchema(payoutDetailsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPayoutDetails = z.infer<typeof insertPayoutDetailsSchema>;
export type PayoutDetails = typeof payoutDetailsTable.$inferSelect;
