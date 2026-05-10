import { and, eq, isNull, isNotNull, lt, ne, or } from "drizzle-orm";
import {
  db,
  ordersTable,
  orderItemsTable,
  orderTimelineTable,
  listingsTable,
  notificationsTable,
} from "@workspace/db";
import { triggerAlert } from "./alertEngine";
import { logger } from "./logger";

const SWEEP_INTERVAL_MS = 60 * 1000; // every 1 minute

async function restoreStock(orderId: number): Promise<void> {
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
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
}

async function cancelOrder(
  order: typeof ordersTable.$inferSelect,
  reason: string,
): Promise<void> {
  await db.update(ordersTable)
    .set({ status: "cancelled" })
    .where(eq(ordersTable.id, order.id));

  await db.insert(orderTimelineTable).values({
    orderId: order.id,
    status: "cancelled",
    note: reason,
    timestamp: new Date(),
  });

  await restoreStock(order.id);

  await db.insert(notificationsTable).values({
    userId: order.buyerId,
    type: "order_update",
    title: "Order Cancelled",
    message: `Your order ${order.orderNumber} was cancelled. ${reason}`,
    orderId: order.id,
  });

  await db.insert(notificationsTable).values({
    userId: order.sellerId,
    type: "order_update",
    title: "Order Cancelled",
    message: `Order ${order.orderNumber} was cancelled. ${reason}`,
    orderId: order.id,
  });

  if (order.transporterId) {
    await db.insert(notificationsTable).values({
      userId: order.transporterId,
      type: "order_update",
      title: "Order Cancelled",
      message: `Order ${order.orderNumber} was cancelled and removed from your queue.`,
      orderId: order.id,
    });
  }

  await triggerAlert("AUTO_CANCEL", `Order #${order.orderNumber} auto-cancelled: ${reason}`, order.id, order.buyerId, "HIGH");
}

async function runTimerSweep(): Promise<void> {
  const now = new Date();

  // ── 1. SELLER CONFIRMATION TIMEOUT (3 hours) ──────────────────────────────
  // Orders that are still "pending" (seller hasn't confirmed) and sellerDeadline has passed.
  const sellerExpired = await db.select().from(ordersTable).where(
    and(
      eq(ordersTable.status, "pending"),
      isNotNull(ordersTable.sellerDeadline),
      lt(ordersTable.sellerDeadline, now),
    )
  );

  for (const order of sellerExpired) {
    logger.info({ orderId: order.id }, "Timer sweeper: seller confirmation timeout");
    await cancelOrder(order, "Seller did not confirm the order within the required time.");
    await triggerAlert(
      "SELLER_DELAY",
      `Order #${order.orderNumber} auto-cancelled — seller did not confirm within 3 hours.`,
      order.id,
      order.sellerId,
      "HIGH"
    );
  }

  // ── 2. TRANSPORT ASSIGNMENT TIMEOUT (12 hours) ────────────────────────────
  // Orders confirmed by seller but no transporter assigned, and transportDeadline has passed.
  const transportExpired = await db.select().from(ordersTable).where(
    and(
      eq(ordersTable.status, "confirmed"),
      isNull(ordersTable.transporterId),
      isNotNull(ordersTable.transportDeadline),
      lt(ordersTable.transportDeadline, now),
    )
  );

  for (const order of transportExpired) {
    logger.info({ orderId: order.id }, "Timer sweeper: transport assignment timeout");
    // Don't cancel — just alert admin and mark status as a known pending state via notification
    await triggerAlert(
      "TRANSPORT_DELAY",
      `No transporter has accepted order #${order.orderNumber} within 12 hours. Immediate attention required.`,
      order.id,
      null,
      "HIGH"
    );
    await db.insert(notificationsTable).values({
      userId: order.buyerId,
      type: "order_update",
      title: "Transport Pending",
      message: `Finding a transporter for your order ${order.orderNumber} is taking longer than expected. We'll notify you as soon as one is assigned.`,
      orderId: order.id,
    });
    await db.insert(notificationsTable).values({
      userId: order.sellerId,
      type: "order_update",
      title: "Transport Pending",
      message: `No transporter has accepted order ${order.orderNumber} in 12 hours. Admin has been alerted.`,
      orderId: order.id,
    });
  }

  // ── 3. PAYMENT TIMEOUT (12 hours from transporter acceptance) ────────────
  // Orders with paymentStatus = "pending" or "retry_allowed" whose paymentDeadline has passed.
  const paymentExpired = await db.select().from(ordersTable).where(
    and(
      or(
        eq(ordersTable.paymentStatus, "pending"),
        eq(ordersTable.paymentStatus, "retry_allowed"),
      ),
      isNotNull(ordersTable.paymentDeadline),
      lt(ordersTable.paymentDeadline, now),
      ne(ordersTable.status, "cancelled"),
      ne(ordersTable.status, "completed"),
    )
  );

  for (const order of paymentExpired) {
    logger.info({ orderId: order.id }, "Timer sweeper: payment timeout");
    await cancelOrder(order, "Payment was not completed within the 12-hour window.");
    await triggerAlert(
      "PAYMENT_DELAY",
      `Order #${order.orderNumber} auto-cancelled — buyer did not complete payment within 12 hours.`,
      order.id,
      order.buyerId,
      "HIGH"
    );
  }

  // ── 4. PAYMENT 2-HOUR REMINDER ────────────────────────────────────────────
  // After 2 hours from paymentDeadline start (i.e., 10hr before deadline), send reminder.
  // We track this with paymentReminderSent so we only send once.
  const twoHrMark = new Date(now.getTime() + 10 * 60 * 60 * 1000); // 10hr before deadline = 2hr after start
  const paymentReminderCandidates = await db.select().from(ordersTable).where(
    and(
      eq(ordersTable.paymentReminderSent, false),
      or(
        eq(ordersTable.paymentStatus, "pending"),
        eq(ordersTable.paymentStatus, "retry_allowed"),
      ),
      isNotNull(ordersTable.paymentDeadline),
      lt(ordersTable.paymentDeadline, twoHrMark),
      ne(ordersTable.status, "cancelled"),
      ne(ordersTable.status, "completed"),
    )
  );

  for (const order of paymentReminderCandidates) {
    logger.info({ orderId: order.id }, "Timer sweeper: sending payment 2-hour reminder");
    await db.update(ordersTable)
      .set({ paymentReminderSent: true })
      .where(eq(ordersTable.id, order.id));

    await db.insert(notificationsTable).values({
      userId: order.buyerId,
      type: "order_update",
      title: "Payment Reminder",
      message: `⚠️ Your order ${order.orderNumber} payment is due soon. You have 10 hours left to complete payment before the order is cancelled.`,
      orderId: order.id,
    });

    await triggerAlert(
      "PAYMENT_DELAY",
      `Payment reminder sent for order #${order.orderNumber} — buyer has not paid 2 hours after transporter accepted.`,
      order.id,
      order.buyerId,
      "MEDIUM"
    );
  }
}

export function startTimerSweeper(): void {
  const tick = async () => {
    try {
      await runTimerSweep();
    } catch (err) {
      logger.error({ err }, "Timer sweeper failed");
    }
  };
  void tick();
  setInterval(tick, SWEEP_INTERVAL_MS);
  logger.info({ intervalMs: SWEEP_INTERVAL_MS }, "Timer sweeper started");
}
