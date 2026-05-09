import { Router } from "express";
import { eq, and, or, isNull, notInArray, inArray } from "drizzle-orm";
import {
  db,
  ordersTable,
  orderTimelineTable,
  orderItemsTable,
  listingsTable,
  usersTable,
  transporterRoutesTable,
  notificationsTable,
} from "@workspace/db";
import {
  CreateTransporterRouteBody,
  AcceptDeliveryBody,
  ConfirmPickupBody,
  ConfirmDeliveryBody,
} from "@workspace/api-zod";
import { authMiddleware } from "../lib/auth";

const router = Router();

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function nextNDays(n: number): string[] {
  const today = new Date();
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push(DAYS[d.getDay()]);
  }
  return out;
}

function extractCity(text: string | null | undefined, knownCities: string[]): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const c of knownCities) {
    if (c && lower.includes(c.toLowerCase())) return c;
  }
  return null;
}

// Directional route matching: seller point must appear BEFORE buyer point in the same route.
// Returns the matched pickup and delivery towns, or null if no match found.
function findDirectionalMatch(
  sellerPoints: string[],
  buyerPoints: string[],
  routes: { startCity: string; stops: string[] | null; endCity: string }[]
): { pickup: string | null; delivery: string | null; isMatch: boolean } {
  for (const route of routes) {
    const stops = [route.startCity, ...(route.stops ?? []), route.endCity].filter((s): s is string => !!s);
    for (const sp of sellerPoints) {
      const sellerIdx = stops.indexOf(sp);
      if (sellerIdx === -1) continue;
      for (const bp of buyerPoints) {
        const buyerIdx = stops.indexOf(bp);
        if (buyerIdx !== -1 && buyerIdx > sellerIdx) {
          return { pickup: sp, delivery: bp, isMatch: true };
        }
      }
    }
  }
  return { pickup: null, delivery: null, isMatch: false };
}

// Tiered platform fee: ≥₹200 transport fee → ₹40 platform; otherwise → ₹20 platform.
const PLATFORM_FEE_HIGH = 40;
const PLATFORM_FEE_LOW = 20;
const PLATFORM_FEE_THRESHOLD = 200;
function computeTransportPlatformFee(transportFee: number): number {
  return transportFee >= PLATFORM_FEE_THRESHOLD ? PLATFORM_FEE_HIGH : PLATFORM_FEE_LOW;
}
const MAX_ROUTES_PER_TRANSPORTER = 7;

router.get("/transporter/routes", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const routes = await db.select().from(transporterRoutesTable)
    .where(eq(transporterRoutesTable.transporterId, user.id));
  res.json(routes);
});

router.post("/transporter/routes", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "transporter" && user.role !== "admin") {
    res.status(403).json({ error: "Transporters only" });
    return;
  }

  const parsed = CreateTransporterRouteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Route could not be saved. Please try again." });
    return;
  }

  const rawStops = req.body.stops;
  const stops: string[] = Array.isArray(rawStops)
    ? rawStops.filter((s: any) => typeof s === "string" && s.trim() !== "")
    : [];

  // Enforce: max 7 routes per transporter (multiple per day allowed)
  const existing = await db.select().from(transporterRoutesTable)
    .where(eq(transporterRoutesTable.transporterId, user.id));
  if (existing.length >= MAX_ROUTES_PER_TRANSPORTER) {
    res.status(400).json({ error: `You can have at most ${MAX_ROUTES_PER_TRANSPORTER} routes.` });
    return;
  }

  const [route] = await db.insert(transporterRoutesTable).values({
    transporterId: user.id,
    ...parsed.data,
    stops,
  }).returning();

  console.log(`[routes] Saved route ${route.id} for transporter ${user.id} with ${stops.length} stops:`, stops);
  res.status(201).json(route);
});

router.patch("/transporter/routes/:id", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "transporter" && user.role !== "admin") {
    res.status(403).json({ error: "Transporters only" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid route id" });
    return;
  }

  const [existing] = await db.select().from(transporterRoutesTable).where(eq(transporterRoutesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Route not found" });
    return;
  }
  if (existing.transporterId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Not your route" });
    return;
  }

  const parsed = CreateTransporterRouteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Route could not be saved. Please try again." });
    return;
  }

  const rawStops = req.body.stops;
  const stops: string[] = Array.isArray(rawStops)
    ? rawStops.filter((s: any) => typeof s === "string" && s.trim() !== "")
    : [];

  const [updated] = await db.update(transporterRoutesTable).set({
    ...parsed.data,
    stops,
  }).where(eq(transporterRoutesTable.id, id)).returning();

  console.log(`[routes] Updated route ${updated.id} for transporter ${user.id}`);
  res.json(updated);
});

router.delete("/transporter/routes/:id", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "transporter" && user.role !== "admin") {
    res.status(403).json({ error: "Transporters only" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid route id" });
    return;
  }

  const [existing] = await db.select().from(transporterRoutesTable).where(eq(transporterRoutesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Route not found" });
    return;
  }
  if (existing.transporterId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Not your route" });
    return;
  }

  await db.delete(transporterRoutesTable).where(eq(transporterRoutesTable.id, id));
  console.log(`[routes] Deleted route ${id} for transporter ${user.id}`);
  res.json({ success: true });
});

router.get("/transporter/orders", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;

  const myRoutes = await db.select().from(transporterRoutesTable)
    .where(eq(transporterRoutesTable.transporterId, user.id));

  // Build the full set of unique stop names (exact strings) across all routes
  const transporterAllStops: string[] = [];
  const routeDays = new Set<string>();
  for (const r of myRoutes) {
    const stops = [r.startCity, ...(r.stops ?? []), r.endCity].filter((s): s is string => !!s);
    for (const s of stops) {
      if (s.trim() && !transporterAllStops.includes(s.trim())) {
        transporterAllStops.push(s.trim());
      }
    }
    if (r.dayOfWeek) routeDays.add(r.dayOfWeek);
  }

  const upcomingDays = new Set(nextNDays(3));
  const hasUpcomingRoute = Array.from(routeDays).some(d => upcomingDays.has(d));

  const candidates = await db.select().from(ordersTable)
    .where(
      or(
        eq(ordersTable.transporterId, user.id),
        and(
          eq(ordersTable.status, "confirmed"),
          isNull(ordersTable.transporterId),
          notInArray(ordersTable.paymentStatus, ["refunded"] as any)
        )
      )!
    );

  const result = await Promise.all(candidates.map(async (order) => {
    const [buyer] = await db.select({
      name: usersTable.name,
      city: usersTable.city,
      address: usersTable.address,
      phone: usersTable.phone,
      deliveryPoints: usersTable.deliveryPoints,
    }).from(usersTable).where(eq(usersTable.id, order.buyerId));

    const [seller] = await db.select({
      name: usersTable.name,
      city: usersTable.city,
      address: usersTable.address,
      phone: usersTable.phone,
      deliveryPoints: usersTable.deliveryPoints,
    }).from(usersTable).where(eq(usersTable.id, order.sellerId));

    const items = await db.select({
      listingId: listingsTable.id,
      city: listingsTable.city,
      address: listingsTable.address,
      breed: listingsTable.breed,
      category: listingsTable.category,
      photos: listingsTable.photos,
      price: listingsTable.price,
      quantity: orderItemsTable.quantity,
    })
      .from(orderItemsTable)
      .innerJoin(listingsTable, eq(orderItemsTable.listingId, listingsTable.id))
      .where(eq(orderItemsTable.orderId, order.id));

    // Seller pickup points: their saved deliveryPoints, or fallback to city
    const sellerPickupPoints: string[] = seller?.deliveryPoints?.length
      ? seller.deliveryPoints
      : seller?.city ? [seller.city] : [];

    // Buyer delivery points: their saved deliveryPoints, or fallback to city
    const buyerDeliveryPoints: string[] = buyer?.deliveryPoints?.length
      ? buyer.deliveryPoints
      : buyer?.city ? [buyer.city] : [];

    // Directional match: seller point must appear BEFORE buyer point in the same route
    const match = findDirectionalMatch(sellerPickupPoints, buyerDeliveryPoints, myRoutes);

    return {
      ...order,
      buyerName: buyer?.name ?? "",
      buyerPhone: buyer?.phone ?? null,
      sellerName: seller?.name ?? "",
      sellerPhone: seller?.phone ?? null,
      pickupCity: match.pickup ?? items[0]?.city ?? seller?.city ?? null,
      deliveryCity: match.delivery ?? buyer?.city ?? null,
      matchedPickupPoint: match.pickup,
      matchedDeliveryPoint: match.delivery,
      items: items.map(it => ({
        listingId: it.listingId,
        name: it.breed,
        category: it.category,
        photo: it.photos?.[0] ?? null,
        price: it.price,
        quantity: it.quantity,
      })),
      _isMatch: match.isMatch,
    };
  }));

  // Filter: assigned orders always show. For unassigned, directional match must be found.
  const filtered = result.filter((o) => {
    if (o.transporterId === user.id) return true;
    if (!hasUpcomingRoute) return false;
    return o._isMatch;
  });

  res.json(filtered.map(({ _isMatch, ...rest }) => rest));
});

router.post("/transporter/orders/:id/accept", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "transporter" && user.role !== "admin") {
    res.status(403).json({ error: "Transporters only" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const parsed = AcceptDeliveryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  // NEW FLOW: transporter accepts BEFORE payment. Order must be seller-confirmed but not yet paid.
  if (order.status !== "confirmed") {
    res.status(400).json({ error: "Seller must confirm the order before transporter accepts" });
    return;
  }
  if (order.transporterId && order.transporterId !== user.id) {
    res.status(409).json({ error: "Order already assigned to another transporter" });
    return;
  }

  const rawFee = req.body?.transportFee;
  const transportFee = typeof rawFee === "number" ? rawFee : Number(rawFee);
  if (!Number.isFinite(transportFee) || transportFee <= 0) {
    res.status(400).json({ error: "Enter a valid transport amount (must be greater than ₹0)." });
    return;
  }
  const transportFeeInt = Math.floor(transportFee);
  // Tiered platform fee: ≥₹200 → ₹40, otherwise ₹20.
  const transportPlatformFee = computeTransportPlatformFee(transportFeeInt);
  if (transportFeeInt <= transportPlatformFee) {
    res.status(400).json({
      error: `Transport amount must be greater than the platform fee (₹${transportPlatformFee}).`,
    });
    return;
  }
  const transporterShareAmount = transportFeeInt - transportPlatformFee;

  // Recompute total to include transport fee, so the buyer's payment includes it.
  const newTotal = Number(order.subtotal) + Number(order.platformFee) + transportFee;

  // Auto-detect pickup and delivery points using exact route intersection
  const acceptRoutes = await db.select().from(transporterRoutesTable)
    .where(eq(transporterRoutesTable.transporterId, user.id));
  const acceptStops: string[] = [];
  for (const r of acceptRoutes) {
    const stops = [r.startCity, ...(r.stops ?? []), r.endCity].filter((s): s is string => !!s);
    for (const s of stops) {
      if (s.trim() && !acceptStops.includes(s.trim())) acceptStops.push(s.trim());
    }
  }
  const [acceptBuyer] = await db.select({ city: usersTable.city, deliveryPoints: usersTable.deliveryPoints })
    .from(usersTable).where(eq(usersTable.id, order.buyerId));
  const [acceptSeller] = await db.select({ city: usersTable.city, deliveryPoints: usersTable.deliveryPoints })
    .from(usersTable).where(eq(usersTable.id, order.sellerId));
  const sellerPts: string[] = acceptSeller?.deliveryPoints?.length
    ? acceptSeller.deliveryPoints
    : acceptSeller?.city ? [acceptSeller.city] : [];
  const buyerPts: string[] = acceptBuyer?.deliveryPoints?.length
    ? acceptBuyer.deliveryPoints
    : acceptBuyer?.city ? [acceptBuyer.city] : [];
  const dirMatch = findDirectionalMatch(sellerPts, buyerPts, acceptRoutes);
  const autoPickupPoint = dirMatch.pickup;
  const autoDeliveryPoint = dirMatch.delivery;

  const [updated] = await db.update(ordersTable).set({
    transporterId: user.id,
    pickupTime: parsed.data.pickupTime,
    deliveryTime: parsed.data.deliveryTime,
    transportFee,
    transporterShareAmount,
    total: newTotal,
    pickupPoint: autoPickupPoint ?? undefined,
    deliveryPoint: autoDeliveryPoint ?? undefined,
  }).where(eq(ordersTable.id, id)).returning();

  await db.insert(orderTimelineTable).values({
    orderId: id,
    status: "transporter_assigned",
    note: `Transporter ${user.name} assigned. Rate: ₹${transportFee}`,
    timestamp: new Date(),
  });

  await db.insert(notificationsTable).values({
    userId: order.sellerId,
    type: "transporter_assigned",
    title: "Transporter Assigned",
    message: `${user.name} will pick up your order`,
    orderId: id,
  });

  await db.insert(notificationsTable).values({
    userId: order.buyerId,
    type: "transporter_assigned",
    title: "Transporter Assigned — Pay Now",
    message: `${user.name} will deliver your order. Final total ₹${newTotal} (incl. transport ₹${transportFee}). Please complete payment to confirm.`,
    orderId: id,
  });

  const [buyer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.buyerId));
  const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.sellerId));
  res.json({ ...updated, buyerName: buyer?.name ?? "", sellerName: seller?.name ?? "", transporterName: user.name });
});

router.post("/transporter/orders/:id/pickup", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const pickupVideoUrl = typeof req.body?.pickupVideoUrl === "string" ? req.body.pickupVideoUrl : null;
  if (!pickupVideoUrl) {
    res.status(400).json({ error: "pickupVideoUrl is required" });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.transporterId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Not your delivery" });
    return;
  }

  const now = new Date();
  // Simplified flow: pickup video auto-advances status to in_transit
  const [updated] = await db.update(ordersTable)
    .set({ status: "in_transit", pickupVideoUrl, pickedUpAt: now, inTransitAt: now })
    .where(eq(ordersTable.id, id))
    .returning();

  await db.insert(orderTimelineTable).values({
    orderId: id,
    status: "picked_up",
    note: "Package picked up by transporter",
    timestamp: now,
  });
  await db.insert(orderTimelineTable).values({
    orderId: id,
    status: "in_transit",
    note: "Auto: package now in transit",
    timestamp: now,
  });

  await db.insert(notificationsTable).values({
    userId: order.buyerId,
    type: "order_update",
    title: "Package Picked Up & In Transit",
    message: `Your order ${order.orderNumber} has been picked up and is on the way!`,
    orderId: id,
  });
  await db.insert(notificationsTable).values({
    userId: order.sellerId,
    type: "order_update",
    title: "Picked Up",
    message: `Order ${order.orderNumber} was picked up by transporter`,
    orderId: id,
  });

  const [buyer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.buyerId));
  const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.sellerId));
  res.json({ ...updated, buyerName: buyer?.name ?? "", sellerName: seller?.name ?? "" });
});

router.post("/transporter/orders/:id/in-transit", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.transporterId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Not your delivery" });
    return;
  }
  if (order.status !== "picked_up") {
    res.status(400).json({ error: "Mark pickup first" });
    return;
  }

  const now = new Date();
  const [updated] = await db.update(ordersTable)
    .set({ status: "in_transit", inTransitAt: now })
    .where(eq(ordersTable.id, id))
    .returning();

  await db.insert(orderTimelineTable).values({
    orderId: id,
    status: "in_transit",
    note: "Package in transit",
    timestamp: now,
  });

  await db.insert(notificationsTable).values({
    userId: order.buyerId,
    type: "order_update",
    title: "In Transit",
    message: `Your order ${order.orderNumber} is on the way`,
    orderId: id,
  });

  res.json(updated);
});

router.post("/transporter/orders/:id/deliver", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const deliveryVideoUrl = typeof req.body?.deliveryVideoUrl === "string" ? req.body.deliveryVideoUrl : null;
  if (!deliveryVideoUrl) {
    res.status(400).json({ error: "deliveryVideoUrl is required" });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.transporterId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Not your delivery" });
    return;
  }

  const now = new Date();
  const [updated] = await db.update(ordersTable)
    .set({ status: "delivered", deliveryVideoUrl, deliveredAt: now })
    .where(eq(ordersTable.id, id))
    .returning();

  await db.insert(orderTimelineTable).values({
    orderId: id,
    status: "delivered",
    note: "Delivered to buyer",
    timestamp: now,
  });

  await db.insert(notificationsTable).values({
    userId: order.buyerId,
    type: "delivered",
    title: "Order Delivered",
    message: `Your order ${order.orderNumber} has been delivered. Please confirm with a video.`,
    orderId: id,
  });
  await db.insert(notificationsTable).values({
    userId: order.sellerId,
    type: "delivered",
    title: "Delivered",
    message: `Order ${order.orderNumber} was delivered`,
    orderId: id,
  });

  const [buyer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.buyerId));
  const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.sellerId));
  res.json({ ...updated, buyerName: buyer?.name ?? "", sellerName: seller?.name ?? "" });
});

export default router;
