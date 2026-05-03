import { and, desc, eq, gt, lt, isNull, ne } from "drizzle-orm";
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
  | "REFUND";

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

  // Threshold timestamps
  const ago30min = new Date(now.getTime() - 30 * 60 * 1000);
  const ago60min = new Date(now.getTime() - 60 * 60 * 1000);
  const ago3hr   = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const ago12hr  = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const ago3days = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

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
    const createdAt = new Date(order.createdAt);

    // PAYMENT_DELAY — pending_payment for 60+ min
    if (order.status === "pending" && order.paymentStatus === "pending" && createdAt <= ago60min) {
      const dup = await hasActiveAlert("PAYMENT_DELAY", order.id, null);
      if (!dup) {
        await triggerAlert(
          "PAYMENT_DELAY",
          `Buyer has not completed payment for order #${order.orderNumber} in over 60 minutes`,
          order.id,
          order.buyerId,
          "HIGH"
        );
      }
    }

    // SELLER_DELAY — confirmed but seller hasn't acted in 3hr
    if (order.status === "confirmed" && order.confirmedAt && new Date(order.confirmedAt) <= ago3hr) {
      const dup = await hasActiveAlert("SELLER_DELAY", order.id, null);
      if (!dup) {
        await triggerAlert(
          "SELLER_DELAY",
          `Seller has not prepared order #${order.orderNumber} within 3 hours of confirmation`,
          order.id,
          order.sellerId,
          "HIGH"
        );
      }
    }

    // TRANSPORT_DELAY — confirmed/ready but no transporter after 12hr
    if (["confirmed", "ready"].includes(order.status) && !order.transporterId && createdAt <= ago12hr) {
      const dup = await hasActiveAlert("TRANSPORT_DELAY", order.id, null);
      if (!dup) {
        await triggerAlert(
          "TRANSPORT_DELAY",
          `No transporter has been assigned to order #${order.orderNumber} after 12 hours`,
          order.id,
          null,
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

  // Cancelled orders alert
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
