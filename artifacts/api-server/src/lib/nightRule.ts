const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/**
 * Returns the effective timer-start datetime applying the global night rule:
 * If `from` is at or after 21:00 IST, the timer MUST NOT start immediately —
 * it starts at the next day 9:00 AM IST instead.
 *
 * Pass `from = new Date()` (default) for "right now".
 */
export function nightRuleStart(from: Date = new Date()): Date {
  const fromInIST = new Date(from.getTime() + IST_OFFSET_MS);
  const istHour = fromInIST.getUTCHours();
  if (istHour >= 21 || istHour < 9) {
    const next = new Date(fromInIST);
    if (istHour >= 21) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    next.setUTCHours(3, 30, 0, 0); // 9:00 AM IST = 3:30 AM UTC
    return next;
  }
  return from;
}
