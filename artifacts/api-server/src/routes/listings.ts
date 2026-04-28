import { Router } from "express";
import { eq, and, gt, gte, lte, ilike, or, sql } from "drizzle-orm";
import { db, listingsTable, usersTable, reviewsTable } from "@workspace/db";
import {
  GetListingsQueryParams,
  CreateListingBody,
  GetListingParams,
  UpdateListingParams,
  UpdateListingBody,
  DeleteListingParams,
} from "@workspace/api-zod";
import { authMiddleware, generatePetCode } from "../lib/auth";

const router = Router();

router.get("/listings", async (req, res): Promise<void> => {
  const parsed = GetListingsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { category, breed, minPrice, maxPrice, search, sellerId } = parsed.data;
  const page = parseInt((req.query.page as string) || "1", 10);
  const limit = parseInt((req.query.limit as string) || "12", 10);
  const city = req.query.city as string | undefined;

  const conditions: any[] = [];
  if (sellerId != null) {
    conditions.push(eq(listingsTable.sellerId, sellerId));
  } else {
    conditions.push(eq(listingsTable.status, "approved"));
    conditions.push(gt(listingsTable.availableQuantity, 0));
  }
  if (category) conditions.push(eq(listingsTable.category, category as any));
  if (breed) conditions.push(ilike(listingsTable.breed, `%${breed}%`));
  if (city) conditions.push(ilike(listingsTable.city, `%${city}%`));
  if (minPrice != null) conditions.push(gte(listingsTable.price, minPrice));
  if (maxPrice != null) conditions.push(lte(listingsTable.price, maxPrice));
  if (search) {
    conditions.push(
      or(
        ilike(listingsTable.breed, `%${search}%`),
        ilike(listingsTable.description, `%${search}%`),
        ilike(listingsTable.category, `%${search}%`)
      )!
    );
  }

  const whereClause = and(...conditions);

  const [totalResult, listings] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(listingsTable).where(whereClause),
    db
      .select({
        listing: listingsTable,
        sellerName: usersTable.name,
      })
      .from(listingsTable)
      .innerJoin(usersTable, eq(listingsTable.sellerId, usersTable.id))
      .where(whereClause)
      .limit(limit)
      .offset((page - 1) * limit),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  res.json({
    listings: listings.map(({ listing, sellerName }) => ({ ...listing, sellerName })),
    total,
    totalPages,
    page,
  });
});

router.post("/listings", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "seller" && user.role !== "admin") {
    res.status(403).json({ error: "Sellers only" });
    return;
  }

  const parsed = CreateListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const petCode = generatePetCode();
  const [listing] = await db.insert(listingsTable).values({
    ...parsed.data,
    sellerId: user.id,
    availableQuantity: parsed.data.quantity,
    status: "pending",
    petCode,
    photos: parsed.data.photos ?? [],
  }).returning();

  const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, user.id));
  res.status(201).json({ ...listing, sellerName: seller.name });
});

router.get("/listings/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [row] = await db
    .select({ listing: listingsTable, sellerName: usersTable.name, sellerInfo: usersTable })
    .from(listingsTable)
    .innerJoin(usersTable, eq(listingsTable.sellerId, usersTable.id))
    .where(eq(listingsTable.id, id));

  if (!row) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  const reviewRows = await db
    .select({ review: reviewsTable, buyerName: usersTable.name })
    .from(reviewsTable)
    .innerJoin(usersTable, eq(reviewsTable.buyerId, usersTable.id))
    .where(eq(reviewsTable.sellerId, row.listing.sellerId));

  const reviews = reviewRows.map(({ review, buyerName }) => ({ ...review, buyerName }));
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const { passwordHash, ...sellerInfo } = row.sellerInfo as any;

  res.json({
    ...row.listing,
    sellerName: row.sellerName,
    sellerInfo,
    reviews,
    avgRating,
  });
});

router.put("/listings/:id", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const parsed = UpdateListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, id));
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  if (listing.sellerId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  const [updated] = await db.update(listingsTable)
    .set({ ...parsed.data, status: "pending" })
    .where(eq(listingsTable.id, id))
    .returning();

  const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.sellerId));
  res.json({ ...updated, sellerName: seller.name });
});

router.delete("/listings/:id", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, id));
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  if (listing.sellerId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  await db.delete(listingsTable).where(eq(listingsTable.id, id));
  res.json({ success: true, message: "Deleted" });
});

router.post("/listings/:id/restock", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const quantityToAdd = parseInt(String(req.body?.quantityToAdd ?? req.body?.quantity ?? 0), 10);
  if (!Number.isFinite(quantityToAdd) || quantityToAdd <= 0) {
    res.status(400).json({ error: "quantityToAdd must be a positive integer" });
    return;
  }

  const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, id));
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  if (listing.sellerId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  const newAvailable = listing.availableQuantity + quantityToAdd;
  const newTotal = listing.quantity + quantityToAdd;
  const nextStatus =
    listing.status === "sold_out" || (listing.status === "approved" && listing.availableQuantity <= 0)
      ? "approved"
      : listing.status;

  const [updated] = await db.update(listingsTable)
    .set({ availableQuantity: newAvailable, quantity: newTotal, status: nextStatus })
    .where(eq(listingsTable.id, id))
    .returning();

  const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.sellerId));
  res.json({ ...updated, sellerName: seller.name });
});

export default router;
