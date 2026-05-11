import { sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { hashPassword } from "./auth";
import { logger } from "./logger";

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
