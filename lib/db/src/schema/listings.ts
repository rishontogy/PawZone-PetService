import { pgTable, text, serial, timestamp, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const listingsTable = pgTable("listings", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull().references(() => usersTable.id),
  category: text("category").notNull().$type<"dogs" | "cats" | "birds" | "fish">(),
  breed: text("breed").notNull(),
  price: real("price").notNull(),
  quantity: integer("quantity").notNull(),
  availableQuantity: integer("available_quantity").notNull(),
  maleQuantity: integer("male_quantity").notNull().default(0),
  femaleQuantity: integer("female_quantity").notNull().default(0),
  pairCount: integer("pair_count").notNull().default(0),
  age: integer("age"),
  vaccinated: boolean("vaccinated").notNull().default(false),
  vaccinationDetails: text("vaccination_details"),
  photos: text("photos").array().notNull().default([]),
  videoUrl: text("video_url"),
  fatherPhoto: text("father_photo"),
  motherPhoto: text("mother_photo"),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending").$type<"pending" | "approved" | "rejected" | "sold_out" | "inactive">(),
  rejectionReason: text("rejection_reason"),
  petCode: text("pet_code"),
  address: text("address").notNull(),
  city: text("city").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertListingSchema = createInsertSchema(listingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listingsTable.$inferSelect;
