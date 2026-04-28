import { Router } from "express";
import { eq, count, sum, and, desc } from "drizzle-orm";
import { db, ordersTable, listingsTable, usersTable, cartTable, transporterRoutesTable, notificationsTable } from "@workspace/db";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/dashboard/buyer", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;

  const allOrders = await db.select().from(ordersTable).where(eq(ordersTable.buyerId, user.id));
  const activeOrders = allOrders.filter(o => !["delivered", "cancelled", "refunded"].includes(o.status)).length;
  const completedOrders = allOrders.filter(o => o.status === "delivered").length;

  const cartItems = await db.select({ qty: cartTable.quantity })
    .from(cartTable).where(eq(cartTable.userId, user.id));
  const cartCount = cartItems.reduce((s, c) => s + c.qty, 0);

  const recentOrders = await db.select().from(ordersTable)
    .where(eq(ordersTable.buyerId, user.id))
    .orderBy(desc(ordersTable.createdAt))
    .limit(5);

  const recentOrdersWithNames = await Promise.all(recentOrders.map(async (order) => {
    const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, order.sellerId));
    return { ...order, buyerName: user.name, sellerName: seller?.name ?? "" };
  }));

  const featuredListings = await db
    .select({ listing: listingsTable, sellerName: usersTable.name })
    .from(listingsTable)
    .innerJoin(usersTable, eq(listingsTable.sellerId, usersTable.id))
    .where(eq(listingsTable.status, "approved"))
    .orderBy(desc(listingsTable.createdAt))
    .limit(8);

  const categories = ["dogs", "cats", "birds", "fish"];
  const categoryStats = await Promise.all(categories.map(async (cat) => {
    const rows = await db.select().from(listingsTable)
      .where(and(eq(listingsTable.category, cat as any), eq(listingsTable.status, "approved")));
    return { category: cat, count: rows.length };
  }));

  res.json({
    stats: {
      totalOrders: allOrders.length,
      pendingOrders: allOrders.filter(o => ["pending_payment", "paid", "ready_for_pickup", "assigned", "in_transit"].includes(o.status)).length,
      deliveredOrders: completedOrders,
      totalSpent: allOrders.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + (o.totalAmount || 0), 0),
      cartItems: cartCount,
    },
    recentOrders: recentOrdersWithNames,
    featuredListings: featuredListings.map(({ listing, sellerName }) => ({ ...listing, sellerName })),
    categoryStats,
  });
});

router.get("/dashboard/seller", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;

  const orders = await db.select().from(ordersTable).where(eq(ordersTable.sellerId, user.id));
  const totalEarnings = orders
    .filter(o => o.paymentStatus === "paid")
    .reduce((s, o) => s + ((o.subtotal || 0) - (o.platformFee || 0)), 0);
  const pendingOrders = orders.filter(o => o.status === "pending").length;

  const listings = await db.select().from(listingsTable).where(eq(listingsTable.sellerId, user.id));
  const totalListings = listings.length;
  const activeListings = listings.filter(l => l.status === "approved").length;
  const totalSold = orders.filter(o => o.status === "delivered").length;

  const recentOrders = await db.select().from(ordersTable)
    .where(eq(ordersTable.sellerId, user.id))
    .orderBy(desc(ordersTable.createdAt))
    .limit(5);

  const recentOrdersWithNames = await Promise.all(recentOrders.map(async (order) => {
    const [buyer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, order.buyerId));
    return { ...order, buyerName: buyer?.name ?? "", sellerName: user.name };
  }));

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const earningsByMonth = months.map((month, idx) => {
    const monthOrders = orders.filter(o => {
      const d = new Date(o.createdAt);
      return d.getMonth() === idx && d.getFullYear() === new Date().getFullYear();
    });
    const earnings = monthOrders.filter(o => o.paymentStatus === "paid")
      .reduce((s, o) => s + (o.subtotal || 0), 0);
    return { month, earnings };
  });

  res.json({
    stats: {
      totalRevenue: totalEarnings,
      pendingOrders,
      totalListings,
      activeListings,
      totalSold,
      sellerScore: user.sellerScore ?? 5,
    },
    recentOrders: recentOrdersWithNames,
    listings: listings.map(l => l),
    earningsByMonth,
  });
});

router.get("/dashboard/transporter", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;

  const orders = await db.select().from(ordersTable).where(eq(ordersTable.transporterId, user.id));
  const pendingDeliveries = orders.filter(o => ["picked_up", "in_transit"].includes(o.status)).length;
  const completedDeliveries = orders.filter(o => o.status === "delivered").length;
  const totalEarnings = completedDeliveries * 100;
  const routes = await db.select().from(transporterRoutesTable)
    .where(eq(transporterRoutesTable.transporterId, user.id));
  const activeRoutes = routes.filter(r => r.active).length;

  const recentDeliveries = await db.select().from(ordersTable)
    .where(eq(ordersTable.transporterId, user.id))
    .orderBy(desc(ordersTable.createdAt))
    .limit(5);

  const recentWithNames = await Promise.all(recentDeliveries.map(async (order) => {
    const [buyer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, order.buyerId));
    const [seller] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, order.sellerId));
    return { ...order, buyerName: buyer?.name ?? "", sellerName: seller?.name ?? "" };
  }));

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const deliveriesByWeek = days.map(day => ({ day, count: 0 }));

  res.json({
    stats: {
      activeDeliveries: pendingDeliveries,
      completedDeliveries,
      totalEarnings,
      activeRoutes,
    },
    recentDeliveries: recentWithNames,
    deliveriesByWeek,
  });
});

router.get("/notifications", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const notifications = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, user.id))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  res.json(notifications);
});

router.post("/notifications/:id/read", authMiddleware, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.id, id));
  res.json({ success: true, message: "Marked as read" });
});

export default router;
