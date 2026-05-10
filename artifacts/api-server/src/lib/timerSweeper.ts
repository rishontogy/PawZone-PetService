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

export async function restoreStock(orderId: number): Promise<void> {
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

async function runTimerSweep(): Promise<void> {
  const now = new Date();

  // ── 1. SELLER CONFIRMATION TIMEOUT (3 hours) ──────────────────────────────
  // Orders still "pending" past sellerDeadline → escalate to admin, DO NOT auto-cancel.
  const sellerExpired = await db.select().from(ordersTable).where(
    and(
      eq(ordersTable.status, "pending"),
      isNotNull(ordersTable.sellerDeadline),
      lt(ordersTable.sellerDeadline, now),
    )
  );

  for (const order of sellerExpired) {
    logger.info({ orderId: order.id }, "Timer sweeper: seller confirmation timeout — escalating to admin");

    await db.update(ordersTable)
      .set({ status: "seller_confirmation_pending" })
      .where(eq(ordersTable.id, order.id));

    await db.insert(orderTimelineTable).values({
      orderId: order.id,
      status: "seller_confirmation_pending",
      note: "Seller did not confirm within 3 hours — admin review required",
      timestamp: now,
    });

    await db.insert(notificationsTable).values({
      userId: order.buyerId,
      type: "order_update",
      title: "Seller Response Delayed",
      message: `The seller has not yet confirmed your order ${order.orderNumber}. Our admin team has been notified and will resolve this shortly.`,
      orderId: order.id,
    });

    await db.insert(notificationsTable).values({
      userId: order.sellerId,
      type: "order_update",
      title: "Action Required: Order Confirmation Overdue",
      message: `Order ${order.orderNumber} requires your immediate confirmation. Admin has been alerted.`,
      orderId: order.id,
    });

    await triggerAlert(
      "SELLER_DELAY",
      `Seller not responding for order #${order.orderNumber} — confirmation window expired. Admin intervention required.`,
      order.id,
      order.sellerId,
      "HIGH"
    );
  }

  // ── 2. TRANSPORT ASSIGNMENT TIMEOUT (12 hours) ────────────────────────────
  // Orders confirmed but no transporter past transportDeadline → alert admin only.
  const transportExpired = await db.select().from(ordersTable).where(
    and(
      eq(ordersTable.status, "confirmed"),
      isNull(ordersTable.transporterId),
      isNotNull(ordersTable.transportDeadline),
      lt(ordersTable.transportDeadline, now),
    )
  );

  for (const order of transportExpired) {
    logger.info({ orderId: order.id }, "Timer sweeper: transport assignment timeout — alerting admin");
    await triggerAlert(
      "TRANSPORT_DELAY",
      `No transporter has accepted order #${order.orderNumber} within 12 hours. Immediate admin intervention required.`,
      order.id,
      null,
      "HIGH"
    );
    await db.insert(notificationsTable).values({
      userId: order.buyerId,
      type: "order_update",
      title: "Transport Pending",
      message: `Finding a transporter for your order ${order.orderNumber} is taking longer than expected. Admin has been alerted and will assign one manually.`,
      orderId: order.id,
    });
    await db.insert(notificationsTable).values({
      userId: order.sellerId,
      type: "order_update",
      title: "Transport Pending",
      message: `No transporter has accepted order ${order.orderNumber} in 12 hours. Admin has been alerted for manual assignment.`,
      orderId: order.id,
    });
  }

  // ── 3. PAYMENT TIMEOUT (5 hours from transporter acceptance) ────────────
  // Orders with paymentStatus = "pending" or "retry_allowed" whose paymentDeadline has passed.
  // DO NOT auto-cancel — escalate to admin for review. Buyer can STILL pay.
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
      ne(ordersTable.status, "payment_pending_admin_review"),
    )
  );

  for (const order of paymentExpired) {
    logger.info({ orderId: order.id }, "Timer sweeper: payment timeout — escalating to admin (no auto-cancel)");

    await db.update(ordersTable)
      .set({ status: "payment_pending_admin_review" })
      .where(eq(ordersTable.id, order.id));

    await db.insert(orderTimelineTable).values({
      orderId: order.id,
      status: "payment_pending_admin_review",
      note: "Payment window expired — awaiting admin review. Buyer may still complete payment.",
      timestamp: now,
    });

    await db.insert(notificationsTable).values({
      userId: order.buyerId,
      type: "order_update",
      title: "Payment Window Expired — Action Required",
      message: `Your payment window for order ${order.orderNumber} has expired. Admin has been notified. You may still complete payment unless the order is cancelled by admin.`,
      orderId: order.id,
    });

    await triggerAlert(
      "PAYMENT_DELAY",
      `Payment not completed for order #${order.orderNumber} after 5-hour window. Admin intervention required. Buyer can still pay.`,
      order.id,
      order.buyerId,
      "HIGH"
    );
  }

  // ── 4. PAYMENT 2-HOUR REMINDER ────────────────────────────────────────────
  // Send reminder 2 hours into the 5-hour payment window (3 hours remaining).
  // deadline = start + 5h → 3h before deadline = 2h after start
  const threeHrBeforeDeadline = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const paymentReminderCandidates = await db.select().from(ordersTable).where(
    and(
      eq(ordersTable.paymentReminderSent, false),
      or(
        eq(ordersTable.paymentStatus, "pending"),
        eq(ordersTable.paymentStatus, "retry_allowed"),
      ),
      isNotNull(ordersTable.paymentDeadline),
      lt(ordersTable.paymentDeadline, threeHrBeforeDeadline),
      ne(ordersTable.status, "cancelled"),
      ne(ordersTable.status, "completed"),
      ne(ordersTable.status, "payment_pending_admin_review"),
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
      title: "⚠️ Payment Reminder — 3 Hours Left",
      message: `You have approximately 3 hours left to complete payment for order ${order.orderNumber}. Please pay now to keep your order active.`,
      orderId: order.id,
    });

    await triggerAlert(
      "PAYMENT_DELAY",
      `Payment reminder: order #${order.orderNumber} payment due in ~3 hours — buyer has not yet paid.`,
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
