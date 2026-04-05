import { connectDB } from "@/lib/db/mongoose";
import { User } from "./model";
import type { IUser } from "./model";

export async function getUserById(id: string): Promise<IUser | null> {
  await connectDB();
  return User.findById(id).lean();
}

export async function updateUser(
  id: string,
  data: { name?: string; birthDate?: Date | null; avatar?: string }
): Promise<IUser | null> {
  await connectDB();
  return User.findByIdAndUpdate(id, data, { new: true }).lean();
}

export async function listUsers(
  page: number = 1,
  perPage: number = 20
): Promise<{ items: IUser[]; total: number }> {
  await connectDB();

  const skip = (page - 1) * perPage;

  const [items, total] = await Promise.all([
    User.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean(),
    User.countDocuments(),
  ]);

  return { items, total };
}
