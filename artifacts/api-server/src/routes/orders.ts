import { Router } from "express";
import { eq, and, desc, or } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, orderTimelineTable, listingsTable, usersTable, cartTable, notificationsTable, disputesTable, paymentProofsTable } from "@workspace/db";
import {
  GetOrdersQueryParams,
  PlaceOrderBody,
  GetOrderParams,
  UpdateOrderStatusBody,
  ProcessPaymentBody,
  ReportIssueBody,
  SubmitPaymentProofBody,
} from "@workspace/api-zod";
import { authMiddleware, generateOrderNumber, generatePetCode } from "../lib/auth";
import { triggerAlert } from "../lib/alertEngine";
import { nightRuleStart } from "../lib/nightRule";

const router = Router();

function calcPlatformFee(price: number, isPair = false): number {
  if (isPair) return price >= 200 ? 30 : 15;
  return price > 100 ? 20 : 5;
}

function formatOrder(
  order: any,
  buyerName: string,
  sellerName: string,
  transporterName?: string | null,
  transporterPhone?: string | null,
  buyerPhone?: string | null,
  orderItems?: any[] | null,
  sellerPhone?: string | null,
) {
  return {
    ...order,
    // Frontend uses `totalAmount` historically; DB column is `total`. Expose both to avoid mismatches.
    totalAmount: order.total,
    buyerName,
    buyerPhone: buyerPhone ?? null,
    sellerName,
    sellerPhone: sellerPhone ?? null,
    transporterName: transporterName ?? null,
    transporterPhone: transporterPhone ?? null,
    orderItems: orderItems ?? [],
    itemCount: orderItems?.length ?? order.itemCount ?? 0,
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
    const [buyer] = await db.select({ phone: usersTable.phone })
      .from(usersTable).where(eq(usersTable.id, order.buyerId));
    const buyerPhone = buyer?.phone ?? null;
    const [seller] = await db.select({ name: usersTable.name, phone: usersTable.phone })
      .from(usersTable).where(eq(usersTable.id, order.sellerId));
    let transporterName = null, transporterPhone = null;
    if (order.transporterId) {
      const [t] = await db.select({ name: usersTable.name, phone: usersTable.phone })
        .from(usersTable).where(eq(usersTable.id, order.transporterId));
      transporterName = t?.name;
      transporterPhone = t?.phone;
    }
    const rawItems = await db
      .select({
        id: orderItemsTable.id,
        listingId: orderItemsTable.listingId,
        quantity: orderItemsTable.quantity,
        unitPrice: orderItemsTable.unitPrice,
        subtotal: orderItemsTable.subtotal,
        gender: orderItemsTable.gender,
      })
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, order.id));

    const orderItems = await Promise.all(rawItems.map(async (item) => {
      if (!item.listingId) return { ...item, breed: null, photo: null, petCode: null };
      const [listing] = await db.select({
        breed: listingsTable.breed,
        photos: listingsTable.photos,
        petCode: listingsTable.petCode,
      }).from(listingsTable).where(eq(listingsTable.id, item.listingId)).limit(1);
      return {
        ...item,
        breed: listing?.breed ?? null,
        photo: listing?.photos?.[0] ?? null,
        petCode: listing?.petCode ?? null,
      };
    }));
    const formatted = formatOrder(order, buyerName, seller?.name ?? "", transporterName, transporterPhone, buyerPhone, orderItems, seller?.phone ?? null);
    // Sellers must not see buyer personal details — strip before returning
    if (user.role === "seller") {
      formatted.buyerName = null;
      formatted.buyerPhone = null;
      formatted.deliveryAddress = null;
    }
    return formatted;
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
    const isPair = (cart.gender as string) === "pair";
    subtotal += listing.price * cart.quantity;
    platformFee += calcPlatformFee(listing.price, isPair) * cart.quantity;
  }

  const orderNumber = generateOrderNumber();
  const petCode = generatePetCode();
  const inventoryLockedUntil = new Date(Date.now() + 3 * 60 * 60 * 1000);

  // Night rule: seller confirmation timer is 3 hours, starting from nightRuleStart(now)
  const sellerTimerStart = nightRuleStart(new Date());
  const sellerDeadline = new Date(sellerTimerStart.getTime() + 3 * 60 * 60 * 1000);

  const customDeliveryPoints =
    Array.isArray(parsed.data.customDeliveryPoints) && parsed.data.customDeliveryPoints.length > 0
      ? parsed.data.customDeliveryPoints
      : null;

  const needsTransporter = req.body.needsTransporter !== false;

  const [order] = await db.insert(ordersTable).values({
    orderNumber,
    buyerId: user.id,
    sellerId,
    needsTransporter,
    status: "pending",
    paymentStatus: "pending",
    subtotal,
    platformFee,
    deliveryFee: 0,
    total: subtotal + platformFee,
    deliveryAddress: parsed.data.deliveryAddress,
    customDeliveryPoints: customDeliveryPoints ?? undefined,
    petCode,
    inventoryLockedUntil,
    sellerDeadline,
  }).returning();

  for (const { cart, listing } of cartItems) {
    await db.insert(orderItemsTable).values({
      orderId: order.id,
      listingId: listing.id,
      quantity: cart.quantity,
      unitPrice: listing.price,
      subtotal: listing.price * cart.quantity,
      gender: cart.gender ?? undefined,
    });
    const adjustedAvailable = Math.max(0, listing.availableQuantity - cart.quantity);
    const genderUpdates: any = {
      availableQuantity: adjustedAvailable,
      ...(adjustedAvailable <= 0 ? { status: "sold_out" as const } : {}),
    };
    if ((cart.gender as string) === "pair") {
      genderUpdates.pairCount = Math.max(0, ((listing as any).pairCount ?? 0) - cart.quantity);
    } else if (cart.gender === "male") {
      genderUpdates.maleQuantity = Math.max(0, listing.maleQuantity - cart.quantity);
    } else if (cart.gender === "female") {
      genderUpdates.femaleQuantity = Math.max(0, listing.femaleQuantity - cart.quantity);
    }
    await db.update(listingsTable)
      .set(genderUpdates)
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
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [orderRow] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!orderRow) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  // Strict isolation: only the buyer, seller, assigned transporter, or admin can view this order.
  const isParticipant =
    orderRow.buyerId === user.id ||
    orderRow.sellerId === user.id ||
    (orderRow.transporterId != null && orderRow.transporterId === user.id);
  if (!isParticipant && user.role !== "admin") {
    req.log?.warn({ userId: user.id, orderId: id, role: user.role }, "Unauthorized order view attempt");
    res.status(403).json({ error: "Access Denied" });
    return;
  }

  const [buyer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, orderRow.buyerId));
  const [seller] = await db.select({ name: usersTable.name, phone: usersTable.phone }).from(usersTable).where(eq(usersTable.id, orderRow.sellerId));
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
    photo: listing.photos?.[0] ?? null,
    petCode: listing.petCode ?? null,
    gender: item.gender ?? null,
  }));

  const timeline = await db.select().from(orderTimelineTable)
    .where(eq(orderTimelineTable.orderId, id))
    .orderBy(orderTimelineTable.timestamp);

  const selfPickup = orderRow.needsTransporter === false;
  const showSellerContact = selfPickup && orderRow.paymentStatus === "paid" && orderRow.buyerId === user.id;
  const sellerPhone = showSellerContact ? (seller?.phone ?? null) : null;
  res.json({
    ...formatOrder(orderRow, buyer?.name ?? "", seller?.name ?? "", transporterName, transporterPhone, null, null, sellerPhone),
    items,
    timeline,
    needsTransporter: orderRow.needsTransporter ?? true,
    sellerContactPhone: sellerPhone,
    sellerContactName: showSellerContact ? (seller?.name ?? null) : null,
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

  // Strict isolation: only the seller who owns the order (or admin) can change its status.
  if (order.sellerId !== user.id && user.role !== "admin") {
    req.log?.warn({ userId: user.id, orderId: id, role: user.role }, "Unauthorized order status change attempt");
    res.status(403).json({ error: "Access Denied" });
    return;
  }

  const updates: any = { status: parsed.data.status };
  if (parsed.data.status === "confirmed") {
    const now = new Date();
    updates.confirmedAt = now;
    if ((order as any).needsTransporter === false) {
      // Self-pickup order: set payment deadline immediately (3 hours, night-rule adjusted)
      const paymentTimerStart = nightRuleStart(now);
      updates.paymentDeadline = new Date(paymentTimerStart.getTime() + 3 * 60 * 60 * 1000);
      req.log?.info({ orderId: order.id, paymentDeadline: updates.paymentDeadline }, "Self-pickup order confirmed — payment deadline set");
      await db.insert(notificationsTable).values({
        userId: order.buyerId,
        type: "order_update",
        title: "Order Confirmed — Pay Now",
        message: `Seller confirmed your order ${order.orderNumber}. Complete payment to arrange self-pickup.`,
        orderId: order.id,
      });
    } else {
      // Normal transport flow: set transport deadline
      const transportTimerStart = nightRuleStart(now);
      updates.transportDeadline = new Date(transportTimerStart.getTime() + 12 * 60 * 60 * 1000);
      req.log?.info(
        { orderId: order.id, transportTimerStart, transportDeadline: updates.transportDeadline },
        "Seller confirmed — transport deadline set"
      );
      await db.insert(notificationsTable).values({
        userId: order.buyerId,
        type: "order_update",
        title: "Order Confirmed by Seller",
        message: `Seller confirmed your order ${order.orderNumber}. Waiting for a transporter to accept.`,
        orderId: order.id,
      });
    }
  }
  if (parsed.data.status === "ready") {
    if (!order.preparedVideoUrl) {
      res.status(400).json({ error: "Upload the prepared video before marking the order ready for pickup." });
      return;
    }
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

  // Payment only allowed after seller confirms
  if (order.status !== "confirmed") {
    res.status(400).json({ error: "Seller has not confirmed your order yet" });
    return;
  }
  // For transport orders: a transporter must be assigned with a fee before buyer can pay.
  // Self-pickup orders skip this check — buyer can pay directly after seller confirms.
  if (order.needsTransporter && (!order.transporterId || !order.transportFee || Number(order.transportFee) <= 0)) {
    res.status(400).json({ error: "A transporter has not yet accepted with a transport fee. Please wait." });
    return;
  }
  if (order.paymentStatus === "paid") {
    res.status(400).json({ error: "Order is already paid" });
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

router.post("/orders/:id/payment-proof", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "buyer") {
    res.status(403).json({ error: "Buyers only" });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const parsed = SubmitPaymentProofBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order || order.buyerId !== user.id) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.paymentStatus === "paid") {
    res.status(400).json({ error: "Order already paid" });
    return;
  }

  if (!["pending", "retry_allowed"].includes(order.paymentStatus)) {
    res.status(400).json({ error: "Cannot submit payment proof for this order" });
    return;
  }

  // Check if there's already a pending proof for this order — prevent duplicates
  const [existing] = await db.select().from(paymentProofsTable)
    .where(and(eq(paymentProofsTable.orderId, id), eq(paymentProofsTable.status, "pending")));
  if (existing) {
    res.status(400).json({ error: "Payment proof already submitted and pending review" });
    return;
  }

  const [proof] = await db.insert(paymentProofsTable).values({
    orderId: id,
    buyerId: user.id,
    screenshotUrl: parsed.data.screenshotUrl,
    referenceNumber: parsed.data.referenceNumber,
    paymentDate: parsed.data.paymentDate,
    status: "pending",
  }).returning();

  await db.update(ordersTable)
    .set({ paymentStatus: "pending_verification" })
    .where(eq(ordersTable.id, id));

  await triggerAlert(
    "PAYMENT_VERIFICATION",
    `New payment proof uploaded for order ${order.orderNumber}. Ref: ${parsed.data.referenceNumber}`,
    order.id,
    user.id,
    "HIGH"
  );

  await db.insert(notificationsTable).values({
    userId: order.sellerId,
    type: "payment_received",
    title: "Payment Proof Submitted",
    message: `Buyer submitted payment proof for order ${order.orderNumber}. Awaiting admin verification.`,
    orderId: id,
  });

  res.status(201).json(proof);
});

router.post("/orders/:id/confirm-pickup", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "buyer") {
    res.status(403).json({ error: "Buyers only" });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order || order.buyerId !== user.id) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if ((order as any).needsTransporter !== false) {
    res.status(400).json({ error: "This route is only for self-pickup orders" });
    return;
  }
  if (order.status !== "ready") {
    res.status(400).json({ error: "Order is not ready for pickup yet" });
    return;
  }
  if (order.paymentStatus !== "paid") {
    res.status(400).json({ error: "Payment must be completed first" });
    return;
  }
  const [updated] = await db.update(ordersTable)
    .set({ status: "completed", receivedAt: new Date() })
    .where(eq(ordersTable.id, id))
    .returning();

  await db.insert(orderTimelineTable).values({
    orderId: id,
    status: "completed",
    note: "Buyer confirmed self-pickup",
    timestamp: new Date(),
  });
  await db.insert(notificationsTable).values({
    userId: order.sellerId,
    type: "order_update",
    title: "Pickup Confirmed",
    message: `Buyer confirmed self-pickup for order ${order.orderNumber}. Order completed!`,
    orderId: id,
  });
  const [buyer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.buyerId));
  const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.sellerId));
  res.json(formatOrder(updated, buyer?.name ?? "", seller?.name ?? ""));
});

router.post("/orders/:id/prepared-video", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  // Accept either { url } or { videoUrl } for backward compatibility.
  const url =
    typeof req.body?.url === "string" ? req.body.url :
    typeof req.body?.videoUrl === "string" ? req.body.videoUrl : null;
  if (!url) {
    res.status(400).json({ error: "videoUrl is required" });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.sellerId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Only the seller can upload the prepared video" });
    return;
  }
  const [updated] = await db.update(ordersTable)
    .set({ preparedVideoUrl: url })
    .where(eq(ordersTable.id, id))
    .returning();
  await db.insert(orderTimelineTable).values({
    orderId: id,
    status: "prepared_video_uploaded",
    note: "Seller uploaded prepared video",
    timestamp: new Date(),
  });
  await db.insert(notificationsTable).values({
    userId: order.buyerId,
    type: "order_update",
    title: "Pet Prepared",
    message: `Seller uploaded a prepared video for order ${order.orderNumber}`,
    orderId: id,
  });
  res.json(updated);
});

router.post("/orders/:id/received-video", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  // Accept either { url } or { videoUrl } for backward compatibility.
  const url =
    typeof req.body?.url === "string" ? req.body.url :
    typeof req.body?.videoUrl === "string" ? req.body.videoUrl : null;
  if (!url) {
    res.status(400).json({ error: "videoUrl is required" });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.buyerId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Only the buyer can confirm receipt" });
    return;
  }
  if (order.status !== "delivered") {
    res.status(400).json({ error: "Order is not yet delivered" });
    return;
  }
  const now = new Date();
  const [updated] = await db.update(ordersTable)
    .set({ receivedVideoUrl: url, receivedAt: now, status: "completed" })
    .where(eq(ordersTable.id, id))
    .returning();
  await db.insert(orderTimelineTable).values({
    orderId: id,
    status: "completed",
    note: "Buyer confirmed receipt with video",
    timestamp: now,
  });
  await db.insert(notificationsTable).values({
    userId: order.sellerId,
    type: "order_update",
    title: "Order Completed",
    message: `Buyer confirmed receipt for order ${order.orderNumber}`,
    orderId: id,
  });
  if (order.transporterId) {
    await db.insert(notificationsTable).values({
      userId: order.transporterId,
      type: "order_update",
      title: "Delivery Confirmed",
      message: `Buyer confirmed receipt for order ${order.orderNumber}`,
      orderId: id,
    });
  }
  res.json(updated);
});

router.post("/orders/:id/pickup-video", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const url =
    typeof req.body?.url === "string" ? req.body.url :
    typeof req.body?.videoUrl === "string" ? req.body.videoUrl : null;
  if (!url) {
    res.status(400).json({ error: "videoUrl is required" });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.transporterId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Only the assigned transporter can upload pickup video" });
    return;
  }
  const now = new Date();
  // Simplified flow: pickup video auto-advances to in_transit
  const [updated] = await db.update(ordersTable)
    .set({ pickupVideoUrl: url, pickedUpAt: now, inTransitAt: now, status: "in_transit" })
    .where(eq(ordersTable.id, id))
    .returning();
  await db.insert(orderTimelineTable).values({ orderId: id, status: "picked_up", note: "Transporter picked up — video uploaded", timestamp: now });
  await db.insert(orderTimelineTable).values({ orderId: id, status: "in_transit", note: "Auto: package now in transit", timestamp: now });
  await db.insert(notificationsTable).values({
    userId: order.buyerId, type: "order_update", title: "Pet Picked Up & In Transit",
    message: `Your order ${order.orderNumber} has been picked up and is on the way!`, orderId: id,
  });
  await db.insert(notificationsTable).values({
    userId: order.sellerId, type: "order_update", title: "Order Picked Up",
    message: `Order ${order.orderNumber} has been picked up`, orderId: id,
  });
  res.json(updated);
});

router.post("/orders/:id/in-transit", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.transporterId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Only the assigned transporter can mark in transit" });
    return;
  }
  const now = new Date();
  const [updated] = await db.update(ordersTable)
    .set({ inTransitAt: now, status: "in_transit" })
    .where(eq(ordersTable.id, id))
    .returning();
  await db.insert(orderTimelineTable).values({ orderId: id, status: "in_transit", note: "Transporter marked in transit", timestamp: now });
  await db.insert(notificationsTable).values({
    userId: order.buyerId, type: "order_update", title: "Order In Transit",
    message: `Your order ${order.orderNumber} is on the way!`, orderId: id,
  });
  res.json(updated);
});

router.post("/orders/:id/delivery-video", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const url =
    typeof req.body?.url === "string" ? req.body.url :
    typeof req.body?.videoUrl === "string" ? req.body.videoUrl : null;
  if (!url) {
    res.status(400).json({ error: "videoUrl is required" });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.transporterId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Only the assigned transporter can upload delivery video" });
    return;
  }
  const now = new Date();
  const [updated] = await db.update(ordersTable)
    .set({ deliveryVideoUrl: url, deliveredAt: now, status: "delivered" })
    .where(eq(ordersTable.id, id))
    .returning();
  await db.insert(orderTimelineTable).values({ orderId: id, status: "delivered", note: "Transporter uploaded delivery video", timestamp: now });
  await db.insert(notificationsTable).values({
    userId: order.buyerId, type: "order_update", title: "Pet Delivered!",
    message: `Your order ${order.orderNumber} has been delivered. Please confirm receipt.`, orderId: id,
  });
  await db.insert(notificationsTable).values({
    userId: order.sellerId, type: "order_update", title: "Order Delivered",
    message: `Order ${order.orderNumber} has been delivered`, orderId: id,
  });
  res.json(updated);
});

router.post("/orders/:id/confirm-delivery", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.buyerId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Only the buyer can confirm delivery" });
    return;
  }
  if (order.status !== "delivered") {
    res.status(400).json({ error: "Order must be delivered before confirming" });
    return;
  }
  const now = new Date();
  const [updated] = await db.update(ordersTable)
    .set({ status: "completed", receivedAt: now })
    .where(eq(ordersTable.id, id))
    .returning();
  await db.insert(orderTimelineTable).values({ orderId: id, status: "completed", note: "Buyer confirmed delivery", timestamp: now });
  await db.insert(notificationsTable).values({
    userId: order.sellerId, type: "order_update", title: "Order Completed",
    message: `Order ${order.orderNumber} has been confirmed by the buyer`, orderId: id,
  });
  if (order.transporterId) {
    await db.insert(notificationsTable).values({
      userId: order.transporterId, type: "order_update", title: "Delivery Confirmed",
      message: `Buyer confirmed receipt for order ${order.orderNumber}`, orderId: id,
    });
  }
  res.json(updated);
});

// Buyer cancel — allowed only before payment is confirmed
router.post("/orders/:id/cancel", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.buyerId !== user.id) {
    res.status(403).json({ error: "Only the buyer can cancel this order" });
    return;
  }
  if (order.paymentStatus === "paid") {
    res.status(400).json({ error: "Cannot cancel an order that has already been paid" });
    return;
  }
  if (order.status === "cancelled" || order.status === "completed") {
    res.status(400).json({ error: "Order is already in a final state" });
    return;
  }

  const now = new Date();
  await db.update(ordersTable)
    .set({ status: "cancelled" })
    .where(eq(ordersTable.id, id));

  await db.insert(orderTimelineTable).values({
    orderId: id,
    status: "cancelled",
    note: "Cancelled by buyer",
    timestamp: now,
  });

  // Restore stock
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
  for (const item of items) {
    if (!item.listingId) continue;
    const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, item.listingId));
    if (!listing) continue;
    const restored = listing.availableQuantity + item.quantity;
    await db.update(listingsTable).set({
      availableQuantity: restored,
      status: restored > 0 ? "approved" : listing.status,
    }).where(eq(listingsTable.id, listing.id));
  }

  await db.insert(notificationsTable).values({
    userId: order.sellerId,
    type: "order_update",
    title: "Order Cancelled by Buyer",
    message: `Order ${order.orderNumber} was cancelled by the buyer.`,
    orderId: id,
  });

  if (order.transporterId) {
    await db.insert(notificationsTable).values({
      userId: order.transporterId,
      type: "order_update",
      title: "Order Cancelled",
      message: `Order ${order.orderNumber} was cancelled by the buyer and removed from your queue.`,
      orderId: id,
    });
  }

  res.json({ success: true, message: "Order cancelled" });
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

  // Only participants on this order can report an issue against it.
  const isParticipant =
    order.buyerId === user.id ||
    order.sellerId === user.id ||
    (order.transporterId != null && order.transporterId === user.id);
  if (!isParticipant && user.role !== "admin") {
    req.log?.warn({ userId: user.id, orderId: id, role: user.role }, "Unauthorized issue report attempt");
    res.status(403).json({ error: "Access Denied" });
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
