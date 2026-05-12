import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const passwordResetRequestsTable = pgTable("password_reset_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  token: text("token"),
  resetCode: text("reset_code"),
  status: text("status").notNull().default("pending")
    .$type<"pending" | "code_sent" | "completed" | "rejected">(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type PasswordResetRequest = typeof passwordResetRequestsTable.$inferSelect;
