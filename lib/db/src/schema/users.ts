import { pgTable, text, serial, timestamp, numeric, real } from "drizzle-orm/pg-core";
// Note: numeric imported but unused — kept for backward compatibility
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  role: text("role").notNull().$type<"buyer" | "seller" | "transporter" | "admin">(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  country: text("country"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  status: text("status").notNull().default("pending").$type<"pending" | "approved" | "blocked">(),
  sellerId: text("seller_id"),
  sellerScore: real("seller_score").default(5),
  platformSharePercent: real("platform_share_percent"),
  profilePhoto: text("profile_photo"),
  deliveryPoints: text("delivery_points").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
