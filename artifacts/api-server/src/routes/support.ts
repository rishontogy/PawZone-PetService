import { Router } from "express";
import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router: Router = Router();

router.post("/support/report", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
  if (!description) {
    res.status(400).json({ error: "Description is required" });
    return;
  }

  const admins = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.role, "admin"));

  const message = `From ${user.name || user.email} (${user.role}): ${description.slice(0, 500)}`;

  if (admins.length > 0) {
    await db.insert(notificationsTable).values(
      admins.map((a) => ({
        userId: a.id,
        type: "support_report" as any,
        title: "User Issue Report",
        message,
      })),
    );
  }

  res.json({ ok: true, notifiedAdmins: admins.length });
});

export default router;
