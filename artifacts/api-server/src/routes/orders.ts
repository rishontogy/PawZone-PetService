import { Router } from "express";
import { eq, and, desc, or } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, orderTimelineTable, listingsTable, usersTable, cartTable, notificationsTable, disputesTable } from "@workspace/db";
import {
  GetOrdersQueryParams,
  PlaceOrderBody,
  GetOrderParams,
  UpdateOrderStatusBody,
  ProcessPaymentBody,
  ReportIssueBody,
} from "@workspace/api-zod";
import { authMiddleware, generateOrderNumber, generatePetCode } from "../lib/auth";

const router = Router();

function calcPlatformFee(price: number): number {
  return price > 100 ? 20 : 5;
}

function formatOrder(order: any, buyerName: string, sellerName: string, transporterName?: string | null, transporterPhone?: string | null) {
  return {
    ...order,
    buyerName,
    sellerName,
    transporterName: transporterName ?? null,
    transporterPhone: transporterPhone ?? null,
  };
}

router.get("/orders", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const parsed = GetOrdersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let conditions: any[] = [];
  if (user.role === "buyer") {
    conditions.push(eq(ordersTable.buyerId, user.id));
  } else if (user.role === "seller") {
    conditions.push(eq(ordersTable.sellerId, user.id));
  } else if (user.role === "transporter") {
    conditions.push(eq(ordersTable.transporterId, user.id));
  }

  if (parsed.data.status) {
    conditions.push(eq(ordersTable.status, parsed.data.status as any));
  }

  const orders = await db
    .select({
      order: ordersTable,
      buyerName: usersTable.name,
    })
    .from(ordersTable)
    .innerJoin(usersTable, eq(ordersTable.buyerId, usersTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(ordersTable.createdAt));

  const result = await Promise.all(orders.map(async ({ order, buyerName }) => {
    const [seller] = await db.select({ name: usersTable.name, phone: usersTable.phone })
      .from(usersTable).where(eq(usersTable.id, order.sellerId));
    let transporterName = null, transporterPhone = null;
    if (order.transporterId) {
      const [t] = await db.select({ name: usersTable.name, phone: usersTable.phone })
        .from(usersTable).where(eq(usersTable.id, order.transporterId));
      transporterName = t?.name;
      transporterPhone = t?.phone;
    }
    return formatOrder(order, buyerName, seller?.name ?? "", transporterName, transporterPhone);
  }));

  const page = parseInt((req.query.page as string) || "1", 10);
  const limit = parseInt((req.query.limit as string) || "10", 10);
  const paged = result.slice((page - 1) * limit, page * limit);
  const total = result.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  res.json({ orders: paged, total, totalPages, page });
});

router.post("/orders", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "buyer") {
    res.status(403).json({ error: "Buyers only" });
    return;
  }

  const parsed = PlaceOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const cartItems = await db
    .select({ cart: cartTable, listing: listingsTable })
    .from(cartTable)
    .innerJoin(listingsTable, eq(cartTable.listingId, listingsTable.id))
    .where(eq(cartTable.userId, user.id));

  if (!cartItems.length) {
    res.status(400).json({ error: "Cart is empty" });
    return;
  }

  const firstItem = cartItems[0];
  const sellerId = firstItem.listing.sellerId;

  let subtotal = 0;
  let platformFee = 0;
  for (const { cart, listing } of cartItems) {
    subtotal += listing.price * cart.quantity;
    platformFee += calcPlatformFee(listing.price) * cart.quantity;
  }

  const orderNumber = generateOrderNumber();
  const petCode = generatePetCode();
  const inventoryLockedUntil = new Date(Date.now() + 3 * 60 * 60 * 1000);

  const [order] = await db.insert(ordersTable).values({
    orderNumber,
    buyerId: user.id,
    sellerId,
    status: "pending",
    paymentStatus: "pending",
    subtotal,
    platformFee,
    deliveryFee: 0,
    total: subtotal + platformFee,
    deliveryAddress: parsed.data.deliveryAddress,
    petCode,
    inventoryLockedUntil,
  }).returning();

  for (const { cart, listing } of cartItems) {
    await db.insert(orderItemsTable).values({
      orderId: order.id,
      listingId: listing.id,
      quantity: cart.quantity,
      unitPrice: listing.price,
      subtotal: listing.price * cart.quantity,
    });
    await db.update(listingsTable)
      .set({ availableQuantity: listing.availableQuantity - cart.quantity })
      .where(eq(listingsTable.id, listing.id));
  }

  await db.insert(orderTimelineTable).values({
    orderId: order.id,
    status: "pending",
    note: "Order placed",
    timestamp: new Date(),
  });

  await db.delete(cartTable).where(eq(cartTable.userId, user.id));

  await db.insert(notificationsTable).values({
    userId: sellerId,
    type: "new_order",
    title: "New Order Received",
    message: `Order ${orderNumber} has been placed`,
    orderId: order.id,
  });

  const [sellerRow] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, sellerId));
  res.status(201).json(formatOrder(order, user.name, sellerRow?.name ?? ""));
});

router.get("/orders/:id", authMiddleware, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [orderRow] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!orderRow) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const [buyer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, orderRow.buyerId));
  const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, orderRow.sellerId));
  let transporterName = null, transporterPhone = null;
  if (orderRow.transporterId) {
    const [t] = await db.select({ name: usersTable.name, phone: usersTable.phone }).from(usersTable).where(eq(usersTable.id, orderRow.transporterId));
    transporterName = t?.name;
    transporterPhone = t?.phone;
  }

  const orderItems = await db
    .select({ item: orderItemsTable, listing: listingsTable })
    .from(orderItemsTable)
    .innerJoin(listingsTable, eq(orderItemsTable.listingId, listingsTable.id))
    .where(eq(orderItemsTable.orderId, id));

  const items = orderItems.map(({ item, listing }) => ({
    id: item.id,
    listingId: item.listingId,
    listingTitle: `${listing.breed} (${listing.category})`,
    category: listing.category,
    breed: listing.breed,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    subtotal: item.subtotal,
    photos: listing.photos,
  }));

  const timeline = await db.select().from(orderTimelineTable)
    .where(eq(orderTimelineTable.orderId, id))
    .orderBy(orderTimelineTable.timestamp);

  res.json({
    ...formatOrder(orderRow, buyer?.name ?? "", seller?.name ?? "", transporterName, transporterPhone),
    items,
    timeline,
  });
});

router.patch("/orders/:id", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const updates: any = { status: parsed.data.status };
  if (parsed.data.status === "confirmed") {
    updates.confirmedAt = new Date();
    // Night-order logic: if the order was placed at or after 9 PM IST (21:00),
    // the payment timer starts at 9 AM IST the next day; otherwise it starts now.
    // Buyer has 3 hours from timerStart to complete payment.
    // Server runs in UTC, so convert order.createdAt to IST (UTC+5:30) before checking hour.
    const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // 5h 30m in ms
    const orderPlacedAt = new Date(order.createdAt);
    const orderInIST = new Date(orderPlacedAt.getTime() + IST_OFFSET_MS);
    const istHour = orderInIST.getUTCHours(); // IST hour (0-23)
    let timerStart: Date;
    if (istHour >= 21) {
      // Start timer at 9 AM IST next day → in UTC that is 3:30 AM next day
      timerStart = new Date(orderInIST);
      timerStart.setUTCDate(timerStart.getUTCDate() + 1);
      timerStart.setUTCHours(3, 30, 0, 0); // 9:00 IST = 03:30 UTC
    } else {
      timerStart = new Date();
    }
    updates.paymentDeadline = new Date(timerStart.getTime() + 3 * 60 * 60 * 1000);
    console.log(`[orders] Order ${order.orderNumber} placed at IST hour ${istHour}. Timer starts: ${timerStart.toISOString()}, deadline: ${updates.paymentDeadline.toISOString()}`);
  }
  if (parsed.data.status === "ready") {
    const petCode = generatePetCode();
    updates.petCode = petCode;
  }

  const [updated] = await db.update(ordersTable).set(updates).where(eq(ordersTable.id, id)).returning();

  await db.insert(orderTimelineTable).values({
    orderId: id,
    status: parsed.data.status,
    note: parsed.data.note ?? null,
    timestamp: new Date(),
  });

  await db.insert(notificationsTable).values({
    userId: order.buyerId,
    type: "order_update",
    title: "Order Update",
    message: `Your order ${order.orderNumber} status changed to ${parsed.data.status}`,
    orderId: id,
  });

  const [buyer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.buyerId));
  const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.sellerId));
  res.json(formatOrder(updated, buyer?.name ?? "", seller?.name ?? ""));
});

router.post("/orders/:id/payment", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const parsed = ProcessPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order || order.buyerId !== user.id) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const [updated] = await db.update(ordersTable)
    .set({ paymentStatus: "paid" })
    .where(eq(ordersTable.id, id))
    .returning();

  await db.insert(notificationsTable).values({
    userId: order.sellerId,
    type: "payment_received",
    title: "Payment Received",
    message: `Payment received for order ${order.orderNumber}`,
    orderId: id,
  });

  const [buyer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.buyerId));
  const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.sellerId));
  res.json(formatOrder(updated, buyer?.name ?? "", seller?.name ?? ""));
});

router.post("/orders/:id/issue", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const parsed = ReportIssueBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  await db.insert(disputesTable).values({
    orderId: id,
    reportedBy: user.id,
    issueType: parsed.data.issueType,
    description: parsed.data.description,
    status: "open",
  });

  res.status(201).json({ success: true, message: "Issue reported successfully" });
});

export default router;
