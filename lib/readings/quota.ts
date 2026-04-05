import { connectDB } from "@/lib/db/mongoose";
import { UserInterpretation } from "./interpretation-model";
import { getActiveSubscription } from "@/lib/subscriptions/service";

/**
 * Count user readings within a date range.
 */
async function countReadingsInRange(
  userId: string,
  from: Date,
  to: Date
): Promise<number> {
  await connectDB();
  return UserInterpretation.countDocuments({
    userId,
    createdAt: { $gte: from, $lt: to },
  });
}

/**
 * Check if user can create a new reading.
 * Uses subscription cycle dates if available, otherwise calendar month.
 * Returns { allowed, used, limit, cycleEnd } for quota display.
 */
export async function checkReadingQuota(
  userId: string,
  readingsMonthlyLimit: number | null
): Promise<{
  allowed: boolean;
  used: number;
  limit: number | null;
  cycleEnd: Date | null;
}> {
  if (readingsMonthlyLimit === null) {
    return { allowed: true, used: 0, limit: null, cycleEnd: null };
  }

  // Try to use subscription cycle dates
  const subscription = await getActiveSubscription(userId);

  let from: Date;
  let to: Date;

  if (subscription) {
    from = new Date(subscription.startsAt);
    to = new Date(subscription.renewsAt);
  } else {
    // Fallback: calendar month
    const now = new Date();
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  const used = await countReadingsInRange(userId, from, to);

  return {
    allowed: used < readingsMonthlyLimit,
    used,
    limit: readingsMonthlyLimit,
    cycleEnd: subscription ? to : null,
  };
}
