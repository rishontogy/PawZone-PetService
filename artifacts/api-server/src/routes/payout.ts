import { Router } from "express";
import { eq, and, inArray, desc, sum } from "drizzle-orm";
import {
  db, usersTable, ordersTable, payoutDetailsTable, payoutTransactionsTable, notificationsTable,
} from "@workspace/db";
import { authMiddleware, adminMiddleware } from "../lib/auth";

const router = Router();

function calcSellerEarnings(orders: any[]): number {
  return orders.reduce((acc, o) => {
    const subtotal = Number(o.subtotal ?? 0);
    const platformFee = subtotal > 100 ? 20 : 5;
    return acc + Math.max(0, subtotal - platformFee);
  }, 0);
}

function calcTransporterEarnings(orders: any[]): number {
  return orders.reduce((acc, o) => {
    return acc + Math.max(0, Number(o.transporterShareAmount ?? 0));
  }, 0);
}

function calcTotalPaid(transactions: any[]): number {
  return transactions.reduce((acc, t) => acc + Number(t.amount ?? 0), 0);
}

const COMPLETED_STATUSES = ["completed", "delivered"] as const;

// ─── SELLER / TRANSPORTER ROUTES ────────────────────────────────────────────

router.use("/payout", authMiddleware);

router.get("/payout/summary", async (req, res): Promise<void> => {
  const user = (req as any).user;
  if (!["seller", "transporter"].includes(user.role)) {
    res.status(403).json({ error: "Only sellers and transporters can access payout data" });
    return;
  }

  const eligibleOrders = await db.select().from(ordersTable).where(
    and(
      user.role === "seller"
        ? eq(ordersTable.sellerId, user.id)
        : eq(ordersTable.transporterId, user.id),
      eq(ordersTable.paymentStatus, "paid"),
      inArray(ordersTable.status, ["completed", "delivered"]),
    ),
  );

  const transactions = await db.select().from(payoutTransactionsTable)
    .where(eq(payoutTransactionsTable.recipientId, user.id))
    .orderBy(desc(payoutTransactionsTable.createdAt));

  const details = await db.select().from(payoutDetailsTable)
    .where(eq(payoutDetailsTable.userId, user.id));

  const totalEarnings = user.role === "seller"
    ? calcSellerEarnings(eligibleOrders)
    : calcTransporterEarnings(eligibleOrders);

  const totalPaid = calcTotalPaid(transactions);
  const remaining = Math.max(0, totalEarnings - totalPaid);
  const lastPayout = transactions.length > 0 ? transactions[0].createdAt : null;

  res.json({
    totalEarnings,
    totalPaid,
    remaining,
    lastPayout,
    orderCount: eligibleOrders.length,
    details: details[0] ?? null,
  });
});

router.get("/payout/details", async (req, res): Promise<void> => {
  const user = (req as any).user;
  if (!["seller", "transporter"].includes(user.role)) {
    res.status(403).json({ error: "Only sellers and transporters can access payout details" });
    return;
  }
  const [details] = await db.select().from(payoutDetailsTable)
    .where(eq(payoutDetailsTable.userId, user.id));
  res.json(details ?? { userId: user.id, upiId: null, qrCodeUrl: null });
});

router.put("/payout/details", async (req, res): Promise<void> => {
  const user = (req as any).user;
  if (!["seller", "transporter"].includes(user.role)) {
    res.status(403).json({ error: "Only sellers and transporters can update payout details" });
    return;
  }

  const { upiId, qrCodeUrl } = req.body ?? {};

  if (upiId !== undefined && typeof upiId === "string" && upiId.trim()) {
    const upiRegex = /^[\w.\-]+@[\w]+$/;
    if (!upiRegex.test(upiId.trim())) {
      res.status(400).json({ error: "Invalid UPI ID format. Expected format: name@bank" });
      return;
    }
  }

  const existing = await db.select().from(payoutDetailsTable)
    .where(eq(payoutDetailsTable.userId, user.id));

  let result: any;
  if (existing.length > 0) {
    const updates: any = {};
    if (upiId !== undefined) updates.upiId = upiId?.trim() || null;
    if (qrCodeUrl !== undefined) updates.qrCodeUrl = qrCodeUrl || null;
    [result] = await db.update(payoutDetailsTable).set(updates)
      .where(eq(payoutDetailsTable.userId, user.id)).returning();
  } else {
    [result] = await db.insert(payoutDetailsTable).values({
      userId: user.id,
      upiId: upiId?.trim() || null,
      qrCodeUrl: qrCodeUrl || null,
    }).returning();
  }
  res.json(result);
});

router.get("/payout/transactions", async (req, res): Promise<void> => {
  const user = (req as any).user;
  if (!["seller", "transporter"].includes(user.role)) {
    res.status(403).json({ error: "Only sellers and transporters can access payout transactions" });
    return;
  }

  const transactions = await db.select({
    id: payoutTransactionsTable.id,
    amount: payoutTransactionsTable.amount,
    referenceNumber: payoutTransactionsTable.referenceNumber,
    screenshotUrl: payoutTransactionsTable.screenshotUrl,
    note: payoutTransactionsTable.note,
    createdAt: payoutTransactionsTable.createdAt,
    adminName: usersTable.name,
  })
    .from(payoutTransactionsTable)
    .leftJoin(usersTable, eq(payoutTransactionsTable.adminId, usersTable.id))
    .where(eq(payoutTransactionsTable.recipientId, user.id))
    .orderBy(desc(payoutTransactionsTable.createdAt));

  res.json({ transactions });
});

// ─── ADMIN ROUTES ────────────────────────────────────────────────────────────

router.use("/admin/payouts", adminMiddleware);

router.get("/admin/payouts", async (req, res): Promise<void> => {
  const sellersAndTransporters = await db.select().from(usersTable)
    .where(
      and(
        inArray(usersTable.role, ["seller", "transporter"]),
        eq(usersTable.status, "approved"),
      ),
    )
    .orderBy(usersTable.name);

  const allOrders = await db.select().from(ordersTable).where(
    and(
      eq(ordersTable.paymentStatus, "paid"),
      inArray(ordersTable.status, ["completed", "delivered"]),
    ),
  );

  const allTransactions = await db.select().from(payoutTransactionsTable);
  const allDetails = await db.select().from(payoutDetailsTable);

  const result = sellersAndTransporters.map((u) => {
    const userOrders = u.role === "seller"
      ? allOrders.filter((o) => o.sellerId === u.id)
      : allOrders.filter((o) => o.transporterId === u.id);

    const totalEarnings = u.role === "seller"
      ? calcSellerEarnings(userOrders)
      : calcTransporterEarnings(userOrders);

    const userTxns = allTransactions.filter((t) => t.recipientId === u.id);
    const totalPaid = calcTotalPaid(userTxns);
    const remaining = Math.max(0, totalEarnings - totalPaid);
    const details = allDetails.find((d) => d.userId === u.id) ?? null;
    const lastPayout = userTxns.length > 0
      ? userTxns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
      : null;

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      totalEarnings,
      totalPaid,
      remaining,
      lastPayout,
      orderCount: userOrders.length,
      upiId: details?.upiId ?? null,
      qrCodeUrl: details?.qrCodeUrl ?? null,
    };
  });

  result.sort((a, b) => b.remaining - a.remaining);
  res.json({ payouts: result });
});

router.get("/admin/payouts/:userId", async (req, res): Promise<void> => {
  const userId = parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId, 10);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || !["seller", "transporter"].includes(user.role)) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const eligibleOrders = await db.select().from(ordersTable).where(
    and(
      user.role === "seller"
        ? eq(ordersTable.sellerId, userId)
        : eq(ordersTable.transporterId, userId),
      eq(ordersTable.paymentStatus, "paid"),
      inArray(ordersTable.status, ["completed", "delivered"]),
    ),
  );

  const transactions = await db.select({
    id: payoutTransactionsTable.id,
    amount: payoutTransactionsTable.amount,
    referenceNumber: payoutTransactionsTable.referenceNumber,
    screenshotUrl: payoutTransactionsTable.screenshotUrl,
    note: payoutTransactionsTable.note,
    createdAt: payoutTransactionsTable.createdAt,
    adminName: usersTable.name,
  })
    .from(payoutTransactionsTable)
    .leftJoin(usersTable, eq(payoutTransactionsTable.adminId, usersTable.id))
    .where(eq(payoutTransactionsTable.recipientId, userId))
    .orderBy(desc(payoutTransactionsTable.createdAt));

  const [details] = await db.select().from(payoutDetailsTable)
    .where(eq(payoutDetailsTable.userId, userId));

  const totalEarnings = user.role === "seller"
    ? calcSellerEarnings(eligibleOrders)
    : calcTransporterEarnings(eligibleOrders);

  const totalPaid = calcTotalPaid(transactions);
  const remaining = Math.max(0, totalEarnings - totalPaid);
  const { passwordHash, ...safeUser } = user as any;

  res.json({
    user: safeUser,
    totalEarnings,
    totalPaid,
    remaining,
    orderCount: eligibleOrders.length,
    upiId: details?.upiId ?? null,
    qrCodeUrl: details?.qrCodeUrl ?? null,
    transactions,
  });
});

router.post("/admin/payouts/:userId/record", async (req, res): Promise<void> => {
  const admin = (req as any).user;
  const userId = parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId, 10);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || !["seller", "transporter"].includes(user.role)) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { amount, referenceNumber, screenshotUrl, note } = req.body ?? {};

  if (!amount || Number(amount) <= 0) {
    res.status(400).json({ error: "Amount must be greater than 0" });
    return;
  }
  if (!referenceNumber?.trim()) {
    res.status(400).json({ error: "Reference number is required" });
    return;
  }
  if (!screenshotUrl?.trim()) {
    res.status(400).json({ error: "Payment screenshot is required" });
    return;
  }

  const [txn] = await db.insert(payoutTransactionsTable).values({
    recipientId: userId,
    adminId: admin.id,
    amount: Number(amount),
    referenceNumber: referenceNumber.trim(),
    screenshotUrl: screenshotUrl.trim(),
    note: note?.trim() || null,
  }).returning();

  await db.insert(notificationsTable).values({
    userId,
    type: "payment",
    title: "Payout Received",
    message: `Admin has paid ₹${Number(amount).toLocaleString("en-IN")} to your account. Ref: ${referenceNumber.trim()}`,
    orderId: null,
  });

  res.json({ transaction: txn });
});

export default router;
