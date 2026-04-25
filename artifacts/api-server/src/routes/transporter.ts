import { Router } from "express";
import { eq, or } from "drizzle-orm";
import { db, ordersTable, orderTimelineTable, usersTable, transporterRoutesTable, notificationsTable } from "@workspace/db";
import {
  CreateTransporterRouteBody,
  AcceptDeliveryBody,
  ConfirmPickupBody,
  ConfirmDeliveryBody,
} from "@workspace/api-zod";
import { authMiddleware } from "../lib/auth";

const router = Router();

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
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [route] = await db.insert(transporterRoutesTable).values({
    transporterId: user.id,
    ...parsed.data,
  }).returning();

  res.status(201).json(route);
});

router.get("/transporter/orders", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;

  const orders = await db.select().from(ordersTable)
    .where(
      or(
        eq(ordersTable.transporterId, user.id),
        eq(ordersTable.status, "ready")
      )!
    );

  const result = await Promise.all(orders.map(async (order) => {
    const [buyer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, order.buyerId));
    const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, order.sellerId));
    return { ...order, buyerName: buyer?.name ?? "", sellerName: seller?.name ?? "" };
  }));

  res.json(result);
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
