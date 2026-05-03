import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { hashPassword } from "./auth";
import { logger } from "./logger";

export async function seedAdmin(): Promise<void> {
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.role, "admin"));
  if (existing) {
    logger.info("Admin account already exists");
    return;
  }

  await db.insert(usersTable).values({
    role: "admin",
    name: "PawZone Admin",
    email: "admin@pawzone.internal",
    passwordHash: hashPassword("PawZone2005"),
    status: "approved",
  });

  logger.info("Admin account created");
}
