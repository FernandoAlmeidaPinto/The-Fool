import { connectDB } from "@/lib/db/mongoose";
import { Plan } from "./model";
import type { IPlan } from "./model";

export async function listPlans(): Promise<IPlan[]> {
  await connectDB();
  return Plan.find().sort({ createdAt: -1 }).lean();
}

export async function getPlanById(id: string): Promise<IPlan | null> {
  await connectDB();
  return Plan.findById(id).lean();
}

export async function createPlan(data: {
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  profileId: string;
  readingsMonthlyLimit?: number | null;
}): Promise<IPlan> {
  await connectDB();
  return Plan.create(data);
}

export async function updatePlan(
  id: string,
  data: {
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    interval?: string;
    profileId?: string;
    readingsMonthlyLimit?: number | null;
    active?: boolean;
  }
): Promise<IPlan | null> {
  await connectDB();
  return Plan.findByIdAndUpdate(id, data, { new: true }).lean();
}

export async function togglePlanActive(id: string): Promise<IPlan | null> {
  await connectDB();
  const plan = await Plan.findById(id);
  if (!plan) return null;
  plan.active = !plan.active;
  await plan.save();
  return plan.toObject();
}
