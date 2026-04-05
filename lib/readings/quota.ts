import { connectDB } from "@/lib/db/mongoose";
import { UserInterpretation } from "./interpretation-model";

/**
 * Count user interpretations created in the current month (day 1 to now).
 */
export async function countReadingsThisMonth(userId: string): Promise<number> {
  await connectDB();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return UserInterpretation.countDocuments({
    userId,
    createdAt: { $gte: startOfMonth },
  });
}

/**
 * Check if user can create a new reading.
 * Returns { allowed, used, limit } for quota display.
 */
export async function checkReadingQuota(
  userId: string,
  readingsMonthlyLimit: number | null
): Promise<{ allowed: boolean; used: number; limit: number | null }> {
  if (readingsMonthlyLimit === null) {
    return { allowed: true, used: 0, limit: null };
  }

  const used = await countReadingsThisMonth(userId);
  return {
    allowed: used < readingsMonthlyLimit,
    used,
    limit: readingsMonthlyLimit,
  };
}
