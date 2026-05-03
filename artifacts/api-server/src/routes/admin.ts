import { Router } from "express";
import { eq, and, desc, ne } from "drizzle-orm";
import { db, usersTable, listingsTable, ordersTable, disputesTable, waitlistTable, notificationsTable, alertsTable } from "@workspace/db";
import { triggerAlert } from "../lib/alertEngine";
import {
  AdminGetUsersQueryParams,
  AdminGetListingsQueryParams,
  AdminRejectListingBody,
  AdminResolveDisputeBody,
} from "@workspace/api-zod";
import { authMiddleware, adminMiddleware } from "../lib/auth";

const router = Router();

router.use("/admin", authMiddleware, adminMiddleware);

function calculateOrder(order: any) {
  const subtotal = Number(order.subtotal ?? 0);
  const transport = Number(order.transportFee ?? 0);
  const buyerFee = subtotal > 100 ? 20 : 5;
  const sellerFee = buyerFee;
  const platformTransportFee = transport > 200 ? 40 : (transport > 0 ? 20 : 0);
  const platformRevenue = buyerFee + sellerFee + platformTransportFee;
  const sellerPayout = Math.max(0, subtotal - sellerFee);
  const transporterPayout = Math.max(0, transport - platformTransportFee);
  const buyerTotal = subtotal + buyerFee + transport;
  return { buyerFee, sellerFee, platformTransportFee, platformRevenue, sellerPayout, transporterPayout, buyerTotal };
}

function isValidOrder(order: any): boolean {
  return order.paymentStatus === "paid" && order.status !== "cancelled";
}

router.get("/admin/users", async (req, res): Promise<void> => {
  const parsed = AdminGetUsersQueryParams.safeParse(req.query);
  const conditions: any[] = [];
  if (parsed.success && parsed.data.role) {
    conditions.push(eq(usersTable.role, parsed.data.role as any));
  }
  if (parsed.success && parsed.data.status) {
    conditions.push(eq(usersTable.status, parsed.data.status as any));
  }
  const page = parseInt((req.query.page as string) || "1", 10);
  const limit = parseInt((req.query.limit as string) || "20", 10);

  const whereClause = conditions.length ? and(...conditions) : undefined;
  const users = await db.select().from(usersTable)
    .where(whereClause)
    .orderBy(desc(usersTable.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const totalResult = await db.select({ count: usersTable.id }).from(usersTable).where(whereClause);
  const total = totalResult.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  res.json({ users: users.map(({ passwordHash, ...u }) => u), total, totalPages, page });
});

router.post("/admin/users/:id/approve", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [user] = await db.update(usersTable).set({ status: "approved" })
    .where(eq(usersTable.id, id)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await db.insert(notificationsTable).values({
    userId: user.id,
    type: "account_approved",
    title: "Account Approved",
    message: "Your account has been approved by admin. You can now use PawZone.",
    orderId: null,
  });

  const { passwordHash, ...u } = user as any;
  res.json(u);
});

router.post("/admin/users/:id/block", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [user] = await db.update(usersTable).set({ status: "blocked" })
    .where(eq(usersTable.id, id)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { passwordHash, ...u } = user as any;
  res.json(u);
});

router.patch("/admin/users/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const updates: any = {};
  if (req.body?.platformSharePercent !== undefined && existing.role === "transporter") {
    const pct = Number(req.body.platformSharePercent);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      res.status(400).json({ error: "platformSharePercent must be 0-100" });
      return;
    }
    updates.platformSharePercent = pct;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  const { passwordHash, ...u } = updated as any;
  res.json(u);
});

router.get("/admin/listings", async (req, res): Promise<void> => {
  const parsed = AdminGetListingsQueryParams.safeParse(req.query);
  const conditions: any[] = [];
  if (parsed.success && parsed.data.status) {
    conditions.push(eq(listingsTable.status, parsed.data.status as any));
  }

  const listings = await db
    .select({ listing: listingsTable, sellerName: usersTable.name })
    .from(listingsTable)
    .innerJoin(usersTable, eq(listingsTable.sellerId, usersTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(listingsTable.createdAt));

  const total = listings.length;
  const totalPages = 1;
  res.json({ listings: listings.map(({ listing, sellerName }) => ({ ...listing, sellerName })), total, totalPages, page: 1 });
});

router.post("/admin/listings/:id/approve", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [listing] = await db.update(listingsTable).set({ status: "approved" })
    .where(eq(listingsTable.id, id)).returning();
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  await db.insert(notificationsTable).values({
    userId: listing.sellerId,
    type: "listing_approved",
    title: "Listing Approved",
    message: `Your listing for ${listing.breed} has been approved`,
    orderId: null,
  });

  const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, listing.sellerId));
  res.json({ ...listing, sellerName: seller?.name ?? "" });
});

router.post("/admin/listings/:id/reject", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const parsed = AdminRejectListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [listing] = await db.update(listingsTable)
    .set({ status: "rejected", rejectionReason: parsed.data.reason })
    .where(eq(listingsTable.id, id))
    .returning();
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  await db.insert(notificationsTable).values({
    userId: listing.sellerId,
    type: "listing_rejected",
    title: "Listing Rejected",
    message: `Your listing for ${listing.breed} was rejected: ${parsed.data.reason}`,
    orderId: null,
  });

  const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, listing.sellerId));
  res.json({ ...listing, sellerName: seller?.name ?? "" });
});

router.get("/admin/orders", async (req, res): Promise<void> => {
  const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(100);
  const result = await Promise.all(orders.map(async (order) => {
    const [buyer] = await db.select({ name: usersTable.name, phone: usersTable.phone }).from(usersTable).where(eq(usersTable.id, order.buyerId));
    const [seller] = await db.select({ name: usersTable.name, phone: usersTable.phone }).from(usersTable).where(eq(usersTable.id, order.sellerId));
    let transporterName = "Not Assigned";
    let transporterPhone = "";
    if (order.transporterId) {
      const [t] = await db.select({ name: usersTable.name, phone: usersTable.phone }).from(usersTable).where(eq(usersTable.id, order.transporterId));
      transporterName = t?.name ?? "Not Assigned";
      transporterPhone = t?.phone ?? "";
    }
    const calc = calculateOrder(order);
    return {
      ...order,
      totalAmount: calc.buyerTotal,
      buyerName: buyer?.name ?? "",
      buyerPhone: buyer?.phone ?? "",
      sellerName: seller?.name ?? "",
      sellerPhone: seller?.phone ?? "",
      transporterName,
      transporterPhone,
      salePlatformFee: calc.buyerFee + calc.sellerFee,
      transportPlatformFee: calc.platformTransportFee,
      platformFee: calc.platformRevenue,
      platformTransportFee: calc.platformTransportFee,
      sellerPayout: calc.sellerPayout,
      transporterPayout: calc.transporterPayout,
      transportFee: Number(order.transportFee ?? 0),
      buyerFee: calc.buyerFee,
      sellerFee: calc.sellerFee,
    };
  }));
  res.json({ orders: result, total: result.length, totalPages: 1 });
});

router.get("/admin/disputes", async (req, res): Promise<void> => {
  const rows = await db
    .select({ dispute: disputesTable, reporterName: usersTable.name, orderNumber: ordersTable.orderNumber })
    .from(disputesTable)
    .innerJoin(usersTable, eq(disputesTable.reportedBy, usersTable.id))
    .innerJoin(ordersTable, eq(disputesTable.orderId, ordersTable.id))
    .orderBy(desc(disputesTable.createdAt));

  const disputes = rows.map(({ dispute, reporterName, orderNumber }) => ({
    ...dispute,
    reporterName,
    orderNumber,
  }));
  res.json({ disputes, total: disputes.length });
});

router.post("/admin/disputes/:id/resolve", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const parsed = AdminResolveDisputeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [dispute] = await db.update(disputesTable).set({
    status: "resolved",
    resolution: parsed.data.resolution,
    resolvedAt: new Date(),
  }).where(eq(disputesTable.id, id)).returning();
  if (!dispute) {
    res.status(404).json({ error: "Dispute not found" });
    return;
  }

  const [reporter] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, dispute.reportedBy));
  const [orderRow] = await db.select({ orderNumber: ordersTable.orderNumber }).from(ordersTable).where(eq(ordersTable.id, dispute.orderId));

  // Notify the customer who filed the dispute
  await db.insert(notificationsTable).values({
    userId: dispute.reportedBy,
    type: "dispute_resolved",
    title: "Your Dispute Has Been Resolved",
    message: parsed.data.resolution || "Admin has reviewed and resolved your dispute.",
    orderId: dispute.orderId,
  });

  res.json({ ...dispute, reportedByName: reporter?.name ?? "", orderNumber: orderRow?.orderNumber ?? "" });
});

router.post("/admin/refunds/:orderId/approve", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
  const orderId = parseInt(raw, 10);

  const [order] = await db.update(ordersTable)
    .set({ status: "refunded", paymentStatus: "refunded" })
    .where(eq(ordersTable.id, orderId))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  await db.insert(notificationsTable).values({
    userId: order.buyerId,
    type: "refund_approved",
    title: "Refund Approved",
    message: `Your refund for order ${order.orderNumber} has been approved`,
    orderId: orderId,
  });

  res.json({ success: true, message: "Refund approved" });
});

router.get("/admin/dashboard", async (req, res): Promise<void> => {
  const allUsers = await db.select().from(usersTable);
  const totalUsers = allUsers.filter(u => u.role !== "admin").length;
  const pendingApprovals = allUsers.filter(u => u.status === "pending").length;

  const allOrders = await db.select().from(ordersTable);
  const totalOrders = allOrders.length;
  const platformRevenue = allOrders
    .filter(isValidOrder)
    .reduce((s, o) => s + calculateOrder(o).platformRevenue, 0);

  const allDisputes = await db.select().from(disputesTable);
  const activeDisputes = allDisputes.filter(d => d.status === "open" || d.status === "in_review").length;

  const allListings = await db.select().from(listingsTable);
  const pendingListings = allListings.filter(l => l.status === "pending").length;

  const recentOrders = await db.select().from(ordersTable)
    .orderBy(desc(ordersTable.createdAt)).limit(10);
  const recentWithNames = await Promise.all(recentOrders.map(async (order) => {
    const [buyer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, order.buyerId));
    const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, order.sellerId));
    let transporterName = "Not Assigned";
    if (order.transporterId) {
      const [t] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, order.transporterId));
      transporterName = t?.name ?? "Not Assigned";
    }
    return {
      ...order,
      buyerName: buyer?.name ?? "",
      sellerName: seller?.name ?? "",
      transporterName,
      totalAmount: Number(order.total ?? 0),
    };
  }));

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const revenueByMonth = months.map((month, idx) => {
    const rev = allOrders.filter(o => {
      const d = new Date(o.createdAt);
      return d.getMonth() === idx && d.getFullYear() === new Date().getFullYear() && isValidOrder(o);
    }).reduce((s, o) => s + calculateOrder(o).platformRevenue, 0);
    return { month, revenue: rev };
  });

  const waitlist = await db.select().from(waitlistTable);

  res.json({
    stats: {
      totalUsers,
      pendingUsers: pendingApprovals,
      totalOrders,
      openDisputes: activeDisputes,
      platformRevenue,
      pendingListings,
      totalListings: allListings.length,
      fraudAlerts: 0,
      waitlistCount: waitlist.length,
    },
    recentOrders: recentWithNames,
    revenueByMonth,
  });
});

router.get("/admin/alerts", async (req, res): Promise<void> => {
  const conditions: any[] = [];
  if (req.query.status) conditions.push(eq(alertsTable.status, req.query.status as any));
  if (req.query.priority) conditions.push(eq(alertsTable.priority, req.query.priority as any));
  if (req.query.type) conditions.push(eq(alertsTable.type, req.query.type as any));

  const alerts = await db
    .select()
    .from(alertsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(alertsTable.createdAt))
    .limit(200);

  const enriched = await Promise.all(alerts.map(async (alert) => {
    let userName: string | null = null;
    let orderNumber: string | null = null;

    if (alert.userId) {
      const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, alert.userId));
      userName = u?.name ?? null;
    }
    if (alert.orderId) {
      const [o] = await db.select({ orderNumber: ordersTable.orderNumber }).from(ordersTable).where(eq(ordersTable.id, alert.orderId));
      orderNumber = o?.orderNumber ?? null;
    }

    return { ...alert, userName, orderNumber };
  }));

  const activeCount = await db
    .select({ id: alertsTable.id })
    .from(alertsTable)
    .where(eq(alertsTable.status, "ACTIVE"));

  res.json({ alerts: enriched, total: enriched.length, activeCount: activeCount.length });
});

router.post("/admin/alerts/:id/resolve", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);

  const [alert] = await db
    .update(alertsTable)
    .set({ status: "RESOLVED", resolvedAt: new Date() })
    .where(eq(alertsTable.id, id))
    .returning();

  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  res.json(alert);
});

router.get("/admin/waitlist", async (req, res): Promise<void> => {
  const entries = await db.select().from(waitlistTable).orderBy(desc(waitlistTable.createdAt));
  res.json(entries);
});

router.get("/admin/accounting", async (req, res): Promise<void> => {
  const allOrders = await db
    .select({
      order: ordersTable,
      buyerName: usersTable.name,
    })
    .from(ordersTable)
    .innerJoin(usersTable, eq(ordersTable.buyerId, usersTable.id))
    .orderBy(desc(ordersTable.createdAt));

  const transactions = await Promise.all(allOrders.map(async ({ order, buyerName }) => {
    const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, order.sellerId));
    let transporterName: string | null = null;
    if (order.transporterId) {
      const [t] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, order.transporterId));
      transporterName = t?.name ?? null;
    }
    const calc = calculateOrder(order);
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      buyerName,
      sellerName: seller?.name ?? "",
      transporterName,
      totalAmount: calc.buyerTotal,
      platformFee: calc.platformRevenue,
      sellerPayout: calc.sellerPayout,
      transporterPayout: calc.transporterPayout,
      platformTransportFee: calc.platformTransportFee,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
    };
  }));

  const validTransactions = transactions.filter(t => isValidOrder({ paymentStatus: t.paymentStatus, status: t.status }));

  const totalRevenue = validTransactions.reduce((s, t) => s + t.totalAmount, 0);
  const totalPlatformFees = validTransactions.reduce((s, t) => s + t.platformFee, 0);
  const totalSellerPayouts = validTransactions.reduce((s, t) => s + t.sellerPayout, 0);
  const totalTransporterPayouts = validTransactions.reduce((s, t) => s + t.transporterPayout, 0);

  // Seller ledger — only count valid (paid, non-cancelled) orders, include sellerId for linking
  const sellerMap: Record<number, { id: number; name: string; totalEarnings: number; completedOrders: number; pendingPayouts: number }> = {};
  for (const { order } of allOrders) {
    const t = transactions.find(tx => tx.orderId === order.id);
    if (!t) continue;
    if (!sellerMap[order.sellerId]) sellerMap[order.sellerId] = { id: order.sellerId, name: t.sellerName, totalEarnings: 0, completedOrders: 0, pendingPayouts: 0 };
    const valid = isValidOrder({ paymentStatus: t.paymentStatus, status: t.status });
    if (valid) {
      sellerMap[order.sellerId].totalEarnings += t.sellerPayout;
      sellerMap[order.sellerId].completedOrders += 1;
    } else if (["pending_payment", "confirmed"].includes(t.status) && t.status !== "cancelled") {
      sellerMap[order.sellerId].pendingPayouts += t.sellerPayout;
    }
  }

  // Transporter ledger — only count valid (paid, non-cancelled) orders with a transporter, include transporterId for linking
  const transporterMap: Record<number, { id: number; name: string; totalEarnings: number; completedDeliveries: number }> = {};
  for (const { order } of allOrders) {
    if (!order.transporterId) continue;
    const t = transactions.find(tx => tx.orderId === order.id);
    if (!t || !t.transporterName) continue;
    if (!transporterMap[order.transporterId]) transporterMap[order.transporterId] = { id: order.transporterId, name: t.transporterName, totalEarnings: 0, completedDeliveries: 0 };
    const valid = isValidOrder({ paymentStatus: t.paymentStatus, status: t.status });
    if (valid) {
      transporterMap[order.transporterId].totalEarnings += t.transporterPayout;
      transporterMap[order.transporterId].completedDeliveries += 1;
    }
  }

  // Daily income last 30 days — only valid orders
  const today = new Date();
  const dailyIncome = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (29 - i));
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    const revenue = validTransactions.filter(t => {
      const td = new Date(t.createdAt);
      return td.getDate() === d.getDate() && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
    }).reduce((s, t) => s + t.platformFee, 0);
    return { date: label, revenue };
  });

  // Monthly income last 12 months — only valid orders
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyIncome = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() - (11 - i));
    const m = d.getMonth();
    const y = d.getFullYear();
    const revenue = validTransactions.filter(t => {
      const td = new Date(t.createdAt);
      return td.getMonth() === m && td.getFullYear() === y;
    }).reduce((s, t) => s + t.platformFee, 0);
    return { month: `${months[m]} ${y}`, revenue };
  });

  res.json({
    summary: { totalRevenue, totalPlatformFees, totalSellerPayouts, totalTransporterPayouts },
    transactions: transactions.slice(0, 100),
    sellerLedger: Object.values(sellerMap),
    transporterLedger: Object.values(transporterMap),
    dailyIncome,
    monthlyIncome,
  });
});

router.get("/admin/ledger/seller/:sellerId", async (req, res): Promise<void> => {
  const sellerId = parseInt(req.params.sellerId, 10);
  const [seller] = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, sellerId));
  if (!seller) { res.status(404).json({ error: "Seller not found" }); return; }

  const orders = await db.select().from(ordersTable).where(eq(ordersTable.sellerId, sellerId)).orderBy(desc(ordersTable.createdAt));
  const validOrders = orders.filter(isValidOrder);

  const rows = validOrders.map(o => {
    const calc = calculateOrder(o);
    return {
      orderId: o.id,
      orderNumber: o.orderNumber,
      date: o.createdAt,
      itemTotal: Number(o.subtotal ?? 0),
      platformFee: calc.sellerFee,
      netPaid: calc.sellerPayout,
    };
  });

  const totalRevenue = rows.reduce((s, r) => s + r.itemTotal, 0);
  const totalPlatformDeduction = rows.reduce((s, r) => s + r.platformFee, 0);
  const netEarnings = rows.reduce((s, r) => s + r.netPaid, 0);

  res.json({
    seller,
    summary: { totalOrders: rows.length, totalRevenue, totalPlatformDeduction, netEarnings },
    orders: rows,
  });
});

router.get("/admin/ledger/transporter/:transporterId", async (req, res): Promise<void> => {
  const transporterId = parseInt(req.params.transporterId, 10);
  const [transporter] = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, transporterId));
  if (!transporter) { res.status(404).json({ error: "Transporter not found" }); return; }

  const orders = await db.select().from(ordersTable).where(eq(ordersTable.transporterId, transporterId)).orderBy(desc(ordersTable.createdAt));
  const validOrders = orders.filter(isValidOrder);

  const rows = validOrders.map(o => {
    const calc = calculateOrder(o);
    return {
      orderId: o.id,
      orderNumber: o.orderNumber,
      date: o.createdAt,
      transportCharge: Number(o.transportFee ?? 0),
      platformFee: calc.platformTransportFee,
      netEarnings: calc.transporterPayout,
    };
  });

  const totalEarnings = rows.reduce((s, r) => s + r.netEarnings, 0);
  const totalPlatformDeduction = rows.reduce((s, r) => s + r.platformFee, 0);

  res.json({
    transporter,
    summary: { totalDeliveries: rows.length, totalEarnings, totalPlatformDeduction },
    orders: rows,
  });
});

export default router;
