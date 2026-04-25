import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, reviewsTable, usersTable } from "@workspace/db";
import { CreateReviewBody } from "@workspace/api-zod";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.post("/reviews", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;

  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [review] = await db.insert(reviewsTable).values({
    orderId: parsed.data.orderId,
    buyerId: user.id,
    sellerId: parsed.data.sellerId,
    rating: parsed.data.rating,
    comment: parsed.data.comment ?? null,
  }).returning();

  res.status(201).json({ ...review, buyerName: user.name });
});

router.get("/reviews/seller/:sellerId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.sellerId) ? req.params.sellerId[0] : req.params.sellerId;
  const sellerId = parseInt(raw, 10);

  const rows = await db
    .select({ review: reviewsTable, buyerName: usersTable.name })
    .from(reviewsTable)
    .innerJoin(usersTable, eq(reviewsTable.buyerId, usersTable.id))
    .where(eq(reviewsTable.sellerId, sellerId));

  res.json(rows.map(({ review, buyerName }) => ({ ...review, buyerName })));
});

export default router;
