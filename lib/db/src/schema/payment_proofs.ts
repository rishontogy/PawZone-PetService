import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { ordersTable } from "./orders";
import { usersTable } from "./users";

export const paymentProofsTable = pgTable("payment_proofs", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  buyerId: integer("buyer_id").notNull().references(() => usersTable.id),
  screenshotUrl: text("screenshot_url").notNull(),
  referenceNumber: text("reference_number").notNull(),
  paymentDate: text("payment_date").notNull(),
  status: text("status").notNull().default("pending")
    .$type<"pending" | "approved" | "rejected">(),
  rejectionCount: integer("rejection_count").notNull().default(0),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export type PaymentProof = typeof paymentProofsTable.$inferSelect;
