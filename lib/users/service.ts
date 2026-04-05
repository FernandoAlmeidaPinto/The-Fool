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
