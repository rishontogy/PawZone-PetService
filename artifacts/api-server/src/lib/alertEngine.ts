import { and, desc, eq, gt, lt, isNull, isNotNull, ne } from "drizzle-orm";
import { db, alertsTable, ordersTable, usersTable } from "@workspace/db";
import { logger } from "./logger";

type AlertType =
  | "SELLER_DELAY"
  | "PAYMENT_DELAY"
  | "TRANSPORT_DELAY"
  | "DELIVERY_DELAY"
  | "CANCELLATION"
  | "FRAUD"
  | "REPORT"
  | "REFUND"
  | "PAYMENT_VERIFICATION"
  | "AUTO_CANCEL";

type Priority = "HIGH" | "MEDIUM" | "LOW";

export async function triggerAlert(
  type: AlertType,
  message: string,
  orderId: number | null,
  userId: number | null,
  priority: Priority = "MEDIUM"
): Promise<void> {
  await db.insert(alertsTable).values({
    type,
    message,
    orderId,
    userId,
    priority,
    status: "ACTIVE",
  });
}

async function hasActiveAlert(type: AlertType, orderId: number | null, userId: number | null): Promise<boolean> {
  const conditions: any[] = [
    eq(alertsTable.type, type),
    eq(alertsTable.status, "ACTIVE"),
  ];
  if (orderId !== null) conditions.push(eq(alertsTable.orderId, orderId));
  if (userId !== null) conditions.push(eq(alertsTable.userId, userId));

  const [existing] = await db.select({ id: alertsTable.id }).from(alertsTable).where(and(...conditions));
  return !!existing;
}

async function runAlertSweep(): Promise<void> {
  const now = new Date();

  const ago3days = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const ago30min = new Date(now.getTime() - 30 * 60 * 1000);

  const activeOrders = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        ne(ordersTable.status, "cancelled"),
        ne(ordersTable.status, "delivered"),
        ne(ordersTable.status, "completed"),
        ne(ordersTable.status, "refunded")
      )
    );

  for (const order of activeOrders) {
    // SELLER_DELAY — still "pending" (awaiting seller confirm) past sellerDeadline
    if (
      order.status === "pending" &&
      order.sellerDeadline &&
      new Date(order.sellerDeadline) <= now
    ) {
      const dup = await hasActiveAlert("SELLER_DELAY", order.id, null);
      if (!dup) {
        await triggerAlert(
          "SELLER_DELAY",
          `Seller has not confirmed order #${order.orderNumber} within the required time`,
          order.id,
          order.sellerId,
          "HIGH"
        );
      }
    }

    // TRANSPORT_DELAY — confirmed but no transporter past transportDeadline
    if (
      order.status === "confirmed" &&
      !order.transporterId &&
      order.transportDeadline &&
      new Date(order.transportDeadline) <= now
    ) {
      const dup = await hasActiveAlert("TRANSPORT_DELAY", order.id, null);
      if (!dup) {
        await triggerAlert(
          "TRANSPORT_DELAY",
          `No transporter has been assigned to order #${order.orderNumber} within 12 hours`,
          order.id,
          null,
          "HIGH"
        );
      }
    }

    // PAYMENT_DELAY — payment not completed past paymentDeadline
    if (
      order.paymentDeadline &&
      new Date(order.paymentDeadline) <= now &&
      order.paymentStatus === "pending" &&
      order.status !== "cancelled"
    ) {
      const dup = await hasActiveAlert("PAYMENT_DELAY", order.id, null);
      if (!dup) {
        await triggerAlert(
          "PAYMENT_DELAY",
          `Buyer has not completed payment for order #${order.orderNumber} — deadline has passed`,
          order.id,
          order.buyerId,
          "HIGH"
        );
      }
    }

    // DELIVERY_DELAY — picked up but not delivered in 3 days
    if (order.status === "in_transit" && order.pickedUpAt && new Date(order.pickedUpAt) <= ago3days) {
      const dup = await hasActiveAlert("DELIVERY_DELAY", order.id, null);
      if (!dup) {
        await triggerAlert(
          "DELIVERY_DELAY",
          `Order #${order.orderNumber} has been in transit for over 3 days without delivery confirmation`,
          order.id,
          order.transporterId,
          "HIGH"
        );
      }
    }
  }

  // Cancelled orders alert (recent only)
  const recentCancellations = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.status, "cancelled"), gt(ordersTable.updatedAt, ago30min)));

  for (const order of recentCancellations) {
    const dup = await hasActiveAlert("CANCELLATION", order.id, null);
    if (!dup) {
      await triggerAlert(
        "CANCELLATION",
        `Order #${order.orderNumber} was cancelled`,
        order.id,
        null,
        "MEDIUM"
      );
    }
  }

  // Fraud check — users with 3+ cancellations (as buyer or seller)
  const allUsers = await db
    .select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
    .from(usersTable)
    .where(ne(usersTable.role, "admin"));

  for (const user of allUsers) {
    const cancelledAsBuyer = await db
      .select({ id: ordersTable.id })
      .from(ordersTable)
      .where(and(eq(ordersTable.buyerId, user.id), eq(ordersTable.status, "cancelled")));

    if (cancelledAsBuyer.length >= 3) {
      const dup = await hasActiveAlert("FRAUD", null, user.id);
      if (!dup) {
        await triggerAlert(
          "FRAUD",
          `User ${user.name} has ${cancelledAsBuyer.length} cancelled orders — possible suspicious activity`,
          null,
          user.id,
          "HIGH"
        );
      }
    }
  }
}

let sweepTimer: ReturnType<typeof setTimeout> | null = null;

export function startAlertEngine(): void {
  async function tick() {
    try {
      await runAlertSweep();
    } catch (err) {
      logger.error({ err }, "Alert engine sweep failed");
    }
    sweepTimer = setTimeout(tick, 5 * 60 * 1000); // run every 5 minutes
  }

  // Initial run after 10s delay (let the DB settle)
  sweepTimer = setTimeout(tick, 10_000);
  logger.info("Alert engine started");
}
