import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, addressesTable } from "@workspace/db";
import { UpdateProfileBody, AddUserAddressBody } from "@workspace/api-zod";
import { authMiddleware, hashPassword } from "../lib/auth";

const router = Router();

router.put("/users/profile", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;

  // Build a sanitized update payload (allow extended profile fields beyond legacy schema).
  const allowedKeys = [
    "name", "phone", "profilePhoto", "address", "city", "state", "pincode",
  ] as const;
  const updates: any = {};
  for (const k of allowedKeys) {
    const v = (req.body ?? {})[k];
    if (typeof v === "string" && v.length > 0) updates[k] = v;
  }

  // Email change
  if (typeof req.body?.email === "string" && req.body.email.length > 0 && req.body.email !== user.email) {
    updates.email = req.body.email.toLowerCase();
  }

  // Password change (requires currentPassword + newPassword)
  if (typeof req.body?.newPassword === "string" && req.body.newPassword.length >= 6) {
    const [me] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));
    if (!me) { res.status(404).json({ error: "User not found" }); return; }
    const currentPw = String(req.body.currentPassword ?? "");
    if (me.passwordHash !== hashPassword(currentPw)) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }
    updates.passwordHash = hashPassword(req.body.newPassword);
  }

  // Transporter platform share %
  if (user.role === "transporter" && req.body?.platformSharePercent !== undefined) {
    const pct = Number(req.body.platformSharePercent);
    if (!Number.isFinite(pct) || pct < 10 || pct > 100) {
      res.status(400).json({ error: "Platform share % must be between 10 and 100" });
      return;
    }
    updates.platformSharePercent = pct;
  }

  // Delivery points — buyers and sellers can update their saved delivery/pickup towns
  if (Array.isArray(req.body?.deliveryPoints)) {
    const pts = (req.body.deliveryPoints as any[]).filter((p) => typeof p === "string" && p.trim());
    updates.deliveryPoints = pts.length > 0 ? pts : null;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [updated] = await db.update(usersTable).set(updates)
    .where(eq(usersTable.id, user.id)).returning();

  const { passwordHash, ...u } = updated as any;
  res.json(u);
});

router.get("/users/addresses", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const addresses = await db.select().from(addressesTable).where(eq(addressesTable.userId, user.id));
  res.json(addresses);
});

router.post("/users/addresses", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;

  const parsed = AddUserAddressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.isDefault) {
    await db.update(addressesTable).set({ isDefault: false }).where(eq(addressesTable.userId, user.id));
  }

  const [address] = await db.insert(addressesTable).values({
    ...parsed.data,
    userId: user.id,
    isDefault: parsed.data.isDefault ?? false,
  }).returning();

  res.status(201).json(address);
});

export default router;
