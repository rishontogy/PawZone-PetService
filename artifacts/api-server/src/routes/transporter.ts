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

// Returns true if `address` contains ANY of the route's keywords (case-insensitive,
// partial match). Keyword priority is the order they appear in the keywords array.
function addressMatchesRouteKeywords(address: string | null | undefined, keywords: string[]): boolean {
  if (!address || keywords.length === 0) return false;
  const lower = address.toLowerCase();
  for (const kw of keywords) {
    const k = kw?.trim().toLowerCase();
    if (k && k.length >= 2 && lower.includes(k)) return true;
  }
  return false;
}

const PLATFORM_FEE_PER_ORDER = 40;
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

  // Enforce: max 7 routes per transporter, and only 1 route per day
  const existing = await db.select().from(transporterRoutesTable)
    .where(eq(transporterRoutesTable.transporterId, user.id));
  if (existing.length >= MAX_ROUTES_PER_TRANSPORTER) {
    res.status(400).json({ error: `You can have at most ${MAX_ROUTES_PER_TRANSPORTER} routes (one per weekday).` });
    return;
  }
  if (existing.some(r => r.dayOfWeek?.toLowerCase() === parsed.data.dayOfWeek.toLowerCase())) {
    res.status(400).json({ error: "Route already exists for this day" });
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

  // Enforce: only 1 route per day (excluding this route)
  const others = await db.select().from(transporterRoutesTable)
    .where(eq(transporterRoutesTable.transporterId, user.id));
  if (others.some(r => r.id !== id && r.dayOfWeek?.toLowerCase() === parsed.data.dayOfWeek.toLowerCase())) {
    res.status(400).json({ error: "Route already exists for this day" });
    return;
  }

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

  // Load this transporter's routes. Keywords come from startCity, endCity, AND stops
  // (in route-input order) — the matching algorithm walks them as priority list.
  const myRoutes = await db.select().from(transporterRoutesTable)
    .where(eq(transporterRoutesTable.transporterId, user.id));

  const routeKeywords: string[] = [];
  const routeDays = new Set<string>();
  const seen = new Set<string>();
  for (const r of myRoutes) {
    const tokens = [r.startCity, ...(r.stops ?? []), r.endCity].filter((s): s is string => !!s);
    for (const t of tokens) {
      const key = t.trim().toLowerCase();
      if (key && !seen.has(key)) { seen.add(key); routeKeywords.push(t.trim()); }
    }
    if (r.dayOfWeek) routeDays.add(r.dayOfWeek);
  }

  // Days within next 2 days (today, tomorrow, day-after)
  const upcomingDays = new Set(nextNDays(3));
  const hasUpcomingRoute = Array.from(routeDays).some(d => upcomingDays.has(d));

  // Query: orders assigned to me OR available (seller-confirmed + unassigned + not yet picked up).
  // NEW FLOW: transporters bid BEFORE payment, so paymentStatus is no longer required to be 'paid'.
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
    const [buyer] = await db.select({ name: usersTable.name, city: usersTable.city, address: usersTable.address })
      .from(usersTable).where(eq(usersTable.id, order.buyerId));
    const [seller] = await db.select({ name: usersTable.name, city: usersTable.city, address: usersTable.address })
      .from(usersTable).where(eq(usersTable.id, order.sellerId));

    // Build full address text for both ends (for keyword matching)
    const items = await db.select({ city: listingsTable.city, address: listingsTable.address })
      .from(orderItemsTable)
      .innerJoin(listingsTable, eq(orderItemsTable.listingId, listingsTable.id))
      .where(eq(orderItemsTable.orderId, order.id));
    const pickupAddress = [items[0]?.address, items[0]?.city, seller?.address, seller?.city]
      .filter(Boolean).join(" ");
    const deliveryAddress = [order.deliveryAddress, buyer?.address, buyer?.city]
      .filter(Boolean).join(" ");

    return {
      ...order,
      buyerName: buyer?.name ?? "",
      sellerName: seller?.name ?? "",
      pickupCity: items[0]?.city ?? seller?.city ?? null,
      deliveryCity: extractCity(order.deliveryAddress, routeKeywords) ?? buyer?.city ?? null,
      _pickupAddress: pickupAddress,
      _deliveryAddress: deliveryAddress,
    };
  }));

  // Filter: assigned orders always show. For unassigned, BOTH pickup and delivery
  // addresses must contain at least one of the transporter's route keywords.
  const filtered = result.filter((o) => {
    if (o.transporterId === user.id) return true;
    if (routeKeywords.length === 0) return false;
    if (!hasUpcomingRoute) return false;
    return addressMatchesRouteKeywords(o._pickupAddress, routeKeywords)
        && addressMatchesRouteKeywords(o._deliveryAddress, routeKeywords);
  });

  // Strip internal helper fields before returning
  res.json(filtered.map(({ _pickupAddress, _deliveryAddress, ...rest }) => rest));
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

  const transportFee = Number(req.body?.transportFee ?? 0);
  if (!Number.isFinite(transportFee) || transportFee <= 0) {
    res.status(400).json({ error: "transportFee is required and must be a positive number" });
    return;
  }
  if (transportFee <= PLATFORM_FEE_PER_ORDER) {
    res.status(400).json({ error: `Transport fee must be greater than ₹${PLATFORM_FEE_PER_ORDER} (flat platform fee).` });
    return;
  }

  // Flat platform fee model: transporter earns (fee - ₹40) per order, no percentage.
  const transporterShareAmount = Math.max(0, transportFee - PLATFORM_FEE_PER_ORDER);

  // Recompute total to include transport fee, so the buyer's payment includes it.
  const newTotal = Number(order.subtotal) + Number(order.platformFee) + transportFee;

  const [updated] = await db.update(ordersTable).set({
    transporterId: user.id,
    pickupTime: parsed.data.pickupTime,
    deliveryTime: parsed.data.deliveryTime,
    transportFee,
    transporterShareAmount,
    total: newTotal,
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
  const [updated] = await db.update(ordersTable)
    .set({ status: "picked_up", pickupVideoUrl, pickedUpAt: now })
    .where(eq(ordersTable.id, id))
    .returning();

  await db.insert(orderTimelineTable).values({
    orderId: id,
    status: "picked_up",
    note: "Package picked up by transporter",
    timestamp: now,
  });

  await db.insert(notificationsTable).values({
    userId: order.buyerId,
    type: "order_update",
    title: "Package Picked Up",
    message: `Your order ${order.orderNumber} has been picked up`,
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
