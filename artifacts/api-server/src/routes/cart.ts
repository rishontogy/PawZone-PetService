import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, cartTable, listingsTable, usersTable } from "@workspace/db";
import { AddToCartBody, UpdateCartItemBody } from "@workspace/api-zod";
import { authMiddleware } from "../lib/auth";

const router = Router();

function calcPlatformFee(price: number): number {
  return price > 100 ? 20 : 5;
}

async function getCartForUser(userId: number) {
  const items = await db
    .select({ cart: cartTable, listing: listingsTable, sellerName: usersTable.name })
    .from(cartTable)
    .innerJoin(listingsTable, eq(cartTable.listingId, listingsTable.id))
    .innerJoin(usersTable, eq(listingsTable.sellerId, usersTable.id))
    .where(eq(cartTable.userId, userId));

  let subtotal = 0;
  let platformFee = 0;

  const cartItems = items.map(({ cart, listing, sellerName }) => {
    const sub = listing.price * cart.quantity;
    const fee = calcPlatformFee(listing.price) * cart.quantity;
    subtotal += sub;
    platformFee += fee;
    return {
      listingId: cart.listingId,
      listing: { ...listing, sellerName },
      quantity: cart.quantity,
      subtotal: sub,
      platformFee: fee,
    };
  });

  return {
    items: cartItems,
    subtotal,
    platformFee,
    total: subtotal + platformFee,
    itemCount: cartItems.reduce((s, i) => s + i.quantity, 0),
  };
}

router.get("/cart", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const cart = await getCartForUser(user.id);
  res.json(cart);
});

router.post("/cart", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const parsed = AddToCartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { listingId, quantity } = parsed.data;

  const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, listingId));
  if (!listing || listing.status !== "approved") {
    res.status(404).json({ error: "Listing not available" });
    return;
  }
  if (quantity > listing.availableQuantity) {
    res.status(400).json({ error: "Requested quantity exceeds available stock" });
    return;
  }

  const [existing] = await db.select().from(cartTable)
    .where(and(eq(cartTable.userId, user.id), eq(cartTable.listingId, listingId)));

  if (existing) {
    await db.update(cartTable).set({ quantity }).where(eq(cartTable.id, existing.id));
  } else {
    await db.insert(cartTable).values({ userId: user.id, listingId, quantity });
  }

  const cart = await getCartForUser(user.id);
  res.json(cart);
});

router.put("/cart/:listingId", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.listingId) ? req.params.listingId[0] : req.params.listingId;
  const listingId = parseInt(raw, 10);

  const parsed = UpdateCartItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { quantity } = parsed.data;

  if (quantity <= 0) {
    await db.delete(cartTable).where(
      and(eq(cartTable.userId, user.id), eq(cartTable.listingId, listingId))
    );
  } else {
    await db.update(cartTable).set({ quantity }).where(
      and(eq(cartTable.userId, user.id), eq(cartTable.listingId, listingId))
    );
  }

  const cart = await getCartForUser(user.id);
  res.json(cart);
});

router.delete("/cart/:listingId", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.listingId) ? req.params.listingId[0] : req.params.listingId;
  const listingId = parseInt(raw, 10);

  await db.delete(cartTable).where(
    and(eq(cartTable.userId, user.id), eq(cartTable.listingId, listingId))
  );

  const cart = await getCartForUser(user.id);
  res.json(cart);
});

export default router;
