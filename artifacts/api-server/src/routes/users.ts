import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, addressesTable } from "@workspace/db";
import { UpdateProfileBody, AddUserAddressBody } from "@workspace/api-zod";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.put("/users/profile", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;

  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db.update(usersTable).set(parsed.data)
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
