import { pgTable, serial, integer, text, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const transporterRoutesTable = pgTable("transporter_routes", {
  id: serial("id").primaryKey(),
  transporterId: integer("transporter_id").notNull().references(() => usersTable.id),
  dayOfWeek: text("day_of_week").notNull(),
  startCity: text("start_city").notNull(),
  endCity: text("end_city").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  stops: json("stops").$type<string[]>().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTransporterRouteSchema = createInsertSchema(transporterRoutesTable).omit({ id: true, createdAt: true });
export type InsertTransporterRoute = z.infer<typeof insertTransporterRouteSchema>;
export type TransporterRoute = typeof transporterRoutesTable.$inferSelect;
