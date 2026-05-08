import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  buyerId: integer("buyer_id").notNull().references(() => usersTable.id),
  sellerId: integer("seller_id").notNull().references(() => usersTable.id),
  transporterId: integer("transporter_id").references(() => usersTable.id),
  status: text("status").notNull().default("pending")
    .$type<"pending" | "confirmed" | "ready" | "picked_up" | "in_transit" | "delivered" | "completed" | "cancelled" | "refunded">(),
  paymentStatus: text("payment_status").notNull().default("pending")
    .$type<"pending" | "paid" | "failed" | "refunded" | "pending_verification" | "retry_allowed">(),
  subtotal: real("subtotal").notNull(),
  platformFee: real("platform_fee").notNull().default(0),
  deliveryFee: real("delivery_fee").notNull().default(0),
  total: real("total").notNull(),
  transportFee: real("transport_fee").notNull().default(0),
  transporterShareAmount: real("transporter_share_amount").notNull().default(0),
  deliveryAddress: text("delivery_address").notNull(),
  pickupPoint: text("pickup_point"),
  deliveryPoint: text("delivery_point"),
  petCode: text("pet_code"),
  barcodeUrl: text("barcode_url"),
  preparedVideoUrl: text("prepared_video_url"),
  pickupVideoUrl: text("pickup_video_url"),
  deliveryVideoUrl: text("delivery_video_url"),
  receivedVideoUrl: text("received_video_url"),
  pickupTime: timestamp("pickup_time", { withTimezone: true }),
  deliveryTime: timestamp("delivery_time", { withTimezone: true }),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  pickedUpAt: timestamp("picked_up_at", { withTimezone: true }),
  inTransitAt: timestamp("in_transit_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  receivedAt: timestamp("received_at", { withTimezone: true }),
  paymentDeadline: timestamp("payment_deadline", { withTimezone: true }),
  inventoryLockedUntil: timestamp("inventory_locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
