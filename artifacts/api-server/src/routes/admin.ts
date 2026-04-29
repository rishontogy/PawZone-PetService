import { Router } from "express";
import { eq, and, desc, ne } from "drizzle-orm";
import { db, usersTable, listingsTable, ordersTable, disputesTable, waitlistTable, notificationsTable } from "@workspace/db";
import {
  AdminGetUsersQueryParams,
  AdminGetListingsQueryParams,
  AdminRejectListingBody,
  AdminResolveDisputeBody,
} from "@workspace/api-zod";
import { authMiddleware, adminMiddleware } from "../lib/auth";

const router = Router();

router.use("/admin", authMiddleware, adminMiddleware);

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
    const [buyer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, order.buyerId));
    const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, order.sellerId));
    return { ...order, buyerName: buyer?.name ?? "", sellerName: seller?.name ?? "" };
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
  const paidOrders = allOrders.filter(o => o.paymentStatus === "paid");
  const sellerCommission = paidOrders.reduce((s, o) => s + Number(o.platformFee || 0), 0);
  // Transport commission = transportFee - transporterShareAmount per paid order with transporter assigned.
  const transportCommission = paidOrders.reduce((s, o) => {
    const fee = Number((o as any).transportFee ?? 0);
    if (fee <= 0) return s;
    const stored = Number((o as any).transporterShareAmount ?? 0);
    if (stored > 0) return s + Math.max(0, fee - stored);
    const platform = fee >= 200 ? 40 : 20;
    return s + platform;
  }, 0);
  const platformRevenue = sellerCommission + transportCommission;

  const allDisputes = await db.select().from(disputesTable);
  const activeDisputes = allDisputes.filter(d => d.status === "open" || d.status === "in_review").length;

  const allListings = await db.select().from(listingsTable);
  const pendingListings = allListings.filter(l => l.status === "pending").length;

  const recentOrders = await db.select().from(ordersTable)
    .orderBy(desc(ordersTable.createdAt)).limit(10);
  const recentWithNames = await Promise.all(recentOrders.map(async (order) => {
    const [buyer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, order.buyerId));
    const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, order.sellerId));
    return { ...order, buyerName: buyer?.name ?? "", sellerName: seller?.name ?? "" };
  }));

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const revenueByMonth = months.map((month, idx) => {
    const rev = allOrders.filter(o => {
      const d = new Date(o.createdAt);
      return d.getMonth() === idx && d.getFullYear() === new Date().getFullYear() && o.paymentStatus === "paid";
    }).reduce((s, o) => s + (o.platformFee || 0), 0);
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
    const price = Number(order.totalAmount ?? 0);
    const fee = Number(order.platformFee ?? 0);
    const deliveryFee = Number(order.deliveryFee ?? 0);
    const sellerPayout = price - fee - deliveryFee;
    const transporterPayout = deliveryFee > 0 ? Math.round(deliveryFee * 0.85) : 0;
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      buyerName,
      sellerName: seller?.name ?? "",
      transporterName,
      totalAmount: price,
      platformFee: fee,
      deliveryFee,
      sellerPayout: Math.max(0, sellerPayout),
      transporterPayout,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
    };
  }));

  const paidTransactions = transactions.filter(t => t.paymentStatus === "paid");

  const totalRevenue = paidTransactions.reduce((s, t) => s + t.totalAmount, 0);
  const totalPlatformFees = paidTransactions.reduce((s, t) => s + t.platformFee, 0);
  const totalSellerPayouts = paidTransactions.reduce((s, t) => s + t.sellerPayout, 0);
  const totalTransporterPayouts = paidTransactions.reduce((s, t) => s + t.transporterPayout, 0);

  // Seller ledger
  const sellerMap: Record<string, { name: string; totalEarnings: number; completedOrders: number; pendingPayouts: number }> = {};
  for (const t of transactions) {
    if (!sellerMap[t.sellerName]) sellerMap[t.sellerName] = { name: t.sellerName, totalEarnings: 0, completedOrders: 0, pendingPayouts: 0 };
    if (t.paymentStatus === "paid") {
      sellerMap[t.sellerName].totalEarnings += t.sellerPayout;
      sellerMap[t.sellerName].completedOrders += 1;
    } else if (["pending_payment", "confirmed"].includes(t.status)) {
      sellerMap[t.sellerName].pendingPayouts += t.sellerPayout;
    }
  }

  // Transporter ledger
  const transporterMap: Record<string, { name: string; totalEarnings: number; completedDeliveries: number }> = {};
  for (const t of transactions) {
    if (!t.transporterName) continue;
    if (!transporterMap[t.transporterName]) transporterMap[t.transporterName] = { name: t.transporterName, totalEarnings: 0, completedDeliveries: 0 };
    if (t.status === "delivered") {
      transporterMap[t.transporterName].totalEarnings += t.transporterPayout;
      transporterMap[t.transporterName].completedDeliveries += 1;
    }
  }

  // Daily income last 30 days
  const today = new Date();
  const dailyIncome = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (29 - i));
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    const revenue = paidTransactions.filter(t => {
      const td = new Date(t.createdAt);
      return td.getDate() === d.getDate() && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
    }).reduce((s, t) => s + t.platformFee, 0);
    return { date: label, revenue };
  });

  // Monthly income last 12 months
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyIncome = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() - (11 - i));
    const m = d.getMonth();
    const y = d.getFullYear();
    const revenue = paidTransactions.filter(t => {
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

export default router;
