import { connectDB } from "@/lib/db/mongoose";
import { UserInterpretation } from "./interpretation-model";
import { getActiveSubscription } from "@/lib/subscriptions/service";
import { Plan } from "@/lib/plans/model";

const FREE_TIER_READINGS_LIMIT = 5;

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
 * Get the readings monthly limit for a user.
 * If subscribed: from the plan. If not: FREE_TIER_READINGS_LIMIT.
 */
async function getReadingsLimit(
  userId: string
): Promise<{ limit: number | null; subscription: Awaited<ReturnType<typeof getActiveSubscription>> }> {
  const subscription = await getActiveSubscription(userId);

  if (subscription) {
    await connectDB();
    const plan = await Plan.findById(subscription.planId).lean();
    return { limit: plan?.readingsMonthlyLimit ?? null, subscription };
  }

  return { limit: FREE_TIER_READINGS_LIMIT, subscription: null };
}

/**
 * Check if user can create a new reading.
 * Self-resolves the limit from the user's subscription plan.
 * Returns { allowed, used, limit, cycleEnd } for quota display.
 */
export async function checkReadingQuota(
  userId: string
): Promise<{
  allowed: boolean;
  used: number;
  limit: number | null;
  cycleEnd: Date | null;
}> {
  const { limit, subscription } = await getReadingsLimit(userId);

  if (limit === null) {
    return { allowed: true, used: 0, limit: null, cycleEnd: null };
  }

  let from: Date;
  let to: Date;

  if (subscription) {
    from = new Date(subscription.startsAt);
    to = new Date(subscription.renewsAt);
  } else {
    // Fallback: calendar month for free tier
    const now = new Date();
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  const used = await countReadingsInRange(userId, from, to);

  return {
    allowed: used < limit,
    used,
    limit,
    cycleEnd: subscription ? to : null,
  };
}
