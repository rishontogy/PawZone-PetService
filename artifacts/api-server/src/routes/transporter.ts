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

  // Load this transporter's routes and gather all cities they service
  const myRoutes = await db.select().from(transporterRoutesTable)
    .where(eq(transporterRoutesTable.transporterId, user.id));

  const routeCities = new Set<string>();
  const routeDays = new Set<string>();
  for (const r of myRoutes) {
    if (r.startCity) routeCities.add(r.startCity);
    if (r.endCity) routeCities.add(r.endCity);
    for (const s of (r.stops ?? [])) if (s) routeCities.add(s);
    if (r.dayOfWeek) routeDays.add(r.dayOfWeek);
  }
  const cityList = Array.from(routeCities);

  // Days within next 2 days (today, tomorrow, day-after)
  const upcomingDays = new Set(nextNDays(3));
  const hasUpcomingRoute = Array.from(routeDays).some(d => upcomingDays.has(d));

  // Query: orders assigned to me OR available (paid + unassigned + not yet picked up)
  const candidates = await db.select().from(ordersTable)
    .where(
      or(
        eq(ordersTable.transporterId, user.id),
        and(
          eq(ordersTable.paymentStatus, "paid"),
          isNull(ordersTable.transporterId),
          notInArray(ordersTable.status, ["picked_up", "in_transit", "delivered", "cancelled", "refunded"])
        )
      )!
    );

  const result = await Promise.all(candidates.map(async (order) => {
    const [buyer] = await db.select({ name: usersTable.name, city: usersTable.city })
      .from(usersTable).where(eq(usersTable.id, order.buyerId));
    const [seller] = await db.select({ name: usersTable.name, city: usersTable.city })
      .from(usersTable).where(eq(usersTable.id, order.sellerId));

    // Determine pickup city from the order's first listing (fallback to seller.city)
    const items = await db.select({ city: listingsTable.city })
      .from(orderItemsTable)
      .innerJoin(listingsTable, eq(orderItemsTable.listingId, listingsTable.id))
      .where(eq(orderItemsTable.orderId, order.id));
    const pickupCity = items[0]?.city ?? seller?.city ?? null;

    // Buyer's delivery city: try to extract from delivery address using known route cities,
    // otherwise fall back to buyer.city
    const deliveryCity =
      extractCity(order.deliveryAddress, cityList) ??
      extractCity(order.deliveryAddress, ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Palakkad", "Alappuzha", "Malappuram", "Kottayam", "Kannur", "Kasaragod", "Wayanad", "Idukki", "Pathanamthitta"]) ??
      buyer?.city ??
      null;

    return {
      ...order,
      buyerName: buyer?.name ?? "",
      sellerName: seller?.name ?? "",
      pickupCity,
      deliveryCity,
    };
  }));

  // Filter: keep orders assigned to me always, plus available orders that match my route cities
  const filtered = result.filter((o) => {
    if (o.transporterId === user.id) return true;
    if (cityList.length === 0) return false; // No routes set up → no available orders
    const pickupOk = o.pickupCity && routeCities.has(o.pickupCity);
    const deliveryOk = o.deliveryCity && routeCities.has(o.deliveryCity);
    if (!pickupOk || !deliveryOk) return false;
    // Only show if any of my routes runs in the next 2 days (today/tomorrow/day-after)
    return hasUpcomingRoute;
  });

  res.json(filtered);
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
  if (order.paymentStatus !== "paid") {
    res.status(400).json({ error: "Order is not yet paid" });
    return;
  }
  if (order.transporterId && order.transporterId !== user.id) {
    res.status(409).json({ error: "Order already assigned to another transporter" });
    return;
  }

  const [updated] = await db.update(ordersTable).set({
    transporterId: user.id,
    pickupTime: parsed.data.pickupTime,
    deliveryTime: parsed.data.deliveryTime,
  }).where(eq(ordersTable.id, id)).returning();

  await db.insert(orderTimelineTable).values({
    orderId: id,
    status: "transporter_assigned",
    note: `Transporter ${user.name} assigned`,
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
    title: "Transporter Assigned",
    message: `Your order will be delivered by ${user.name}`,
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

  const parsed = ConfirmPickupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.petCode && order.petCode !== parsed.data.petCode) {
    res.status(400).json({ error: "Invalid pet code" });
    return;
  }

  const [updated] = await db.update(ordersTable)
    .set({ status: "picked_up" })
    .where(eq(ordersTable.id, id))
    .returning();

  await db.insert(orderTimelineTable).values({
    orderId: id,
    status: "picked_up",
    note: "Package picked up by transporter",
    timestamp: new Date(),
  });

  await db.insert(notificationsTable).values({
    userId: order.buyerId,
    type: "order_update",
    title: "Package Picked Up",
    message: `Your order ${order.orderNumber} has been picked up`,
    orderId: id,
  });

  const [buyer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.buyerId));
  const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.sellerId));
  res.json({ ...updated, buyerName: buyer?.name ?? "", sellerName: seller?.name ?? "" });
});

router.post("/transporter/orders/:id/deliver", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const parsed = ConfirmDeliveryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const [updated] = await db.update(ordersTable)
    .set({ status: "delivered" })
    .where(eq(ordersTable.id, id))
    .returning();

  await db.insert(orderTimelineTable).values({
    orderId: id,
    status: "delivered",
    note: `Delivered at ${parsed.data.location}`,
    timestamp: new Date(),
  });

  await db.insert(notificationsTable).values({
    userId: order.buyerId,
    type: "delivered",
    title: "Order Delivered",
    message: `Your order ${order.orderNumber} has been delivered!`,
    orderId: id,
  });

  const [buyer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.buyerId));
  const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.sellerId));
  res.json({ ...updated, buyerName: buyer?.name ?? "", sellerName: seller?.name ?? "" });
});

export default router;
