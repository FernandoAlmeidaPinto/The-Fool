import { connectDB } from "@/lib/db/mongoose";
import { Subscription } from "./model";
import type { ISubscription } from "./model";
import { User } from "@/lib/users/model";
import { Plan } from "@/lib/plans/model";
import { getFreeTierProfile } from "@/lib/profiles/service";

const CYCLE_DAYS = 30;

/**
 * Get the user's active subscription (status=active AND not expired).
 */
export async function getActiveSubscription(
  userId: string
): Promise<ISubscription | null> {
  await connectDB();

  const sub = await Subscription.findOne({
    userId,
    status: "active",
  }).lean();

  if (!sub) return null;

  // Check if expired by date
  if (new Date(sub.renewsAt) < new Date()) {
    // Mark as expired in background (don't block)
    Subscription.findByIdAndUpdate(sub._id, { status: "expired" }).exec();
    return null;
  }

  return sub;
}

/**
 * Subscribe user to a plan. Cancels any existing active subscription.
 */
export async function subscribeToPlan(
  userId: string,
  planId: string
): Promise<ISubscription> {
  await connectDB();

  const plan = await Plan.findById(planId).lean();
  if (!plan) throw new Error("Plano não encontrado");
  if (!plan.active) throw new Error("Plano não está disponível");

  // Cancel any existing active subscription
  await Subscription.updateMany(
    { userId, status: "active" },
    { status: "cancelled" }
  );

  const now = new Date();
  const renewsAt = new Date(now.getTime() + CYCLE_DAYS * 24 * 60 * 60 * 1000);

  // Create new subscription
  const subscription = await Subscription.create({
    userId,
    planId: plan._id,
    profileId: plan.profileId,
    status: "active",
    startsAt: now,
    renewsAt,
  });

  // Update user's profile to the plan's profile
  await User.findByIdAndUpdate(userId, { profileId: plan.profileId });

  return subscription.toObject();
}

/**
 * Cancel user's active subscription. Reverts to free_tier profile.
 */
export async function cancelSubscription(
  userId: string
): Promise<boolean> {
  await connectDB();

  const result = await Subscription.updateMany(
    { userId, status: "active" },
    { status: "cancelled" }
  );

  if (result.modifiedCount === 0) return false;

  // Revert user to free_tier profile
  const freeTier = await getFreeTierProfile();
  if (freeTier) {
    await User.findByIdAndUpdate(userId, { profileId: freeTier._id });
  }

  return true;
}
