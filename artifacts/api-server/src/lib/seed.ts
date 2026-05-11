import { db, usersTable, transporterRoutesTable } from "@workspace/db";
import { hashPassword } from "./auth";
import { logger } from "./logger";
import { eq } from "drizzle-orm";

export async function seedAdmin(): Promise<void> {
  try {
    await db
      .insert(usersTable)
      .values({
        role: "admin",
        name: "PawZone Admin",
        email: "admin@pawzone.internal",
        passwordHash: hashPassword("PawZone2005"),
        status: "approved",
      })
      .onConflictDoUpdate({
        target: usersTable.email,
        set: {
          role: "admin",
          status: "approved",
          passwordHash: hashPassword("PawZone2005"),
        },
      });

    logger.info("Admin account ensured");
  } catch (err) {
    logger.error({ err }, "Failed to seed admin account");
  }
}

export async function seedDemoUsers(): Promise<void> {
  const demoUsers = [
    { role: "buyer" as const, name: "Arun Kumar", email: "arun@example.com", password: "test123", status: "approved" as const },
    { role: "seller" as const, name: "Rajan Pillai", email: "rajan@example.com", password: "seller123", status: "approved" as const, sellerId: "SEL001" },
    { role: "transporter" as const, name: "Saji Thomas", email: "saji@example.com", password: "transport123", status: "approved" as const },
  ];

  for (const u of demoUsers) {
    try {
      await db
        .insert(usersTable)
        .values({
          role: u.role,
          name: u.name,
          email: u.email,
          passwordHash: hashPassword(u.password),
          status: u.status,
          sellerId: (u as any).sellerId ?? null,
          sellerScore: 5,
        })
        .onConflictDoUpdate({
          target: usersTable.email,
          set: {
            status: u.status,
            passwordHash: hashPassword(u.password),
          },
        });
    } catch (err) {
      logger.error({ err, email: u.email }, "Failed to seed demo user");
    }
  }

  logger.info("Demo users ensured");
}

export async function seedDemoRoutes(): Promise<void> {
  try {
    const [saji] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, "saji@example.com"));

    if (!saji) return;

    const existing = await db
      .select({ id: transporterRoutesTable.id })
      .from(transporterRoutesTable)
      .where(eq(transporterRoutesTable.transporterId, saji.id));

    if (existing.length > 0) {
      logger.info("Saji demo routes already exist, skipping");
      return;
    }

    // Saji covers Kochi/Ernakulam ↔ Kottayam corridor (covers most test orders)
    const demoRoutes = [
      { dayOfWeek: "Monday",    startCity: "Kochi", endCity: "Kottayam", stops: ["Kadavanthara", "Thrippunithura", "Ettumanoor"] as string[], startTime: "08:00", endTime: "14:00" },
      { dayOfWeek: "Tuesday",   startCity: "Kochi", endCity: "Kottayam", stops: ["Kadavanthara", "Thrippunithura", "Ettumanoor"] as string[], startTime: "08:00", endTime: "14:00" },
      { dayOfWeek: "Wednesday", startCity: "Kochi", endCity: "Pala",     stops: ["Kadavanthara", "Thrippunithura", "Kottayam", "Ettumanoor"] as string[], startTime: "08:00", endTime: "16:00" },
      { dayOfWeek: "Thursday",  startCity: "Kochi", endCity: "Kottayam", stops: ["Kadavanthara", "Thrippunithura", "Ettumanoor"] as string[], startTime: "08:00", endTime: "14:00" },
      { dayOfWeek: "Friday",    startCity: "Kochi", endCity: "Pala",     stops: ["Kadavanthara", "Thrippunithura", "Kottayam", "Ettumanoor"] as string[], startTime: "08:00", endTime: "16:00" },
      { dayOfWeek: "Saturday",  startCity: "Kochi", endCity: "Kottayam", stops: ["Kadavanthara", "Thrippunithura", "Ettumanoor"] as string[], startTime: "08:00", endTime: "14:00" },
    ];

    for (const route of demoRoutes) {
      await db.insert(transporterRoutesTable).values({
        transporterId: saji.id,
        ...route,
        active: true,
      });
    }

    logger.info({ transporterId: saji.id, count: demoRoutes.length }, "Saji demo routes seeded");
  } catch (err) {
    logger.error({ err }, "Failed to seed demo routes");
  }
}
