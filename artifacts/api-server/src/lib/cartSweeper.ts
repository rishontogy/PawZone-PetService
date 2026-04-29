import { sql, and, eq } from "drizzle-orm";
import { db, cartTable, listingsTable, notificationsTable } from "@workspace/db";
import { logger } from "./logger";

const EXPIRY_MS = 3 * 60 * 60 * 1000; // 3 hours
const WARN_MS = Math.floor(2.5 * 60 * 60 * 1000); // 2.5 hours
const SWEEP_INTERVAL_MS = 60 * 1000; // 1 minute

async function runSweep(): Promise<void> {
  const now = Date.now();
  const expiredCutoff = new Date(now - EXPIRY_MS);
  const warnCutoff = new Date(now - WARN_MS);

  // 1. Send "expiring soon" warning for items past 2.5h that haven't been notified yet
  //    AND aren't yet expired (so we don't double-fire alongside the removal).
  const warningCandidates = await db
    .select({ cart: cartTable, listing: listingsTable })
    .from(cartTable)
    .innerJoin(listingsTable, eq(cartTable.listingId, listingsTable.id))
    .where(
      and(
        eq(cartTable.expiringNotified, false),
        sql`${cartTable.addedAt} <= ${warnCutoff}`,
        sql`${cartTable.addedAt} > ${expiredCutoff}`,
      ),
    );

  for (const { cart, listing } of warningCandidates) {
    await db.insert(notificationsTable).values({
      userId: cart.userId,
      type: "cart_expiring",
      title: "Cart item expiring soon",
      message: `Your cart item "${listing.breed}" will expire in 30 minutes. Complete your order to keep it.`,
    });
    await db.update(cartTable).set({ expiringNotified: true }).where(eq(cartTable.id, cart.id));
  }

  // 2. Remove expired items (older than 3 hours) and notify the buyer.
  //    Stock auto-restores because cart never decremented availableQuantity.
  const expiredItems = await db
    .select({ cart: cartTable, listing: listingsTable })
    .from(cartTable)
    .innerJoin(listingsTable, eq(cartTable.listingId, listingsTable.id))
    .where(sql`${cartTable.addedAt} <= ${expiredCutoff}`);

  for (const { cart, listing } of expiredItems) {
    await db.delete(cartTable).where(eq(cartTable.id, cart.id));
    await db.insert(notificationsTable).values({
      userId: cart.userId,
      type: "cart_expired",
      title: "Item removed from cart",
      message: `"${listing.breed}" was removed from your cart due to inactivity (3 hour limit).`,
    });
  }

  if (warningCandidates.length > 0 || expiredItems.length > 0) {
    logger.info(
      { warned: warningCandidates.length, expired: expiredItems.length },
      "Cart sweeper run complete",
    );
  }
}

export function startCartSweeper(): void {
  const tick = async () => {
    try {
      await runSweep();
    } catch (err) {
      logger.error({ err }, "Cart sweeper failed");
    }
  };
  void tick();
  setInterval(tick, SWEEP_INTERVAL_MS);
  logger.info({ intervalMs: SWEEP_INTERVAL_MS }, "Cart sweeper started");
}
