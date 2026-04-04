import { connectDB } from "@/lib/db/mongoose";
import { Profile } from "./model";
import type { IProfile } from "./model";

export async function listProfiles(): Promise<IProfile[]> {
  await connectDB();
  return Profile.find().sort({ name: 1 }).lean();
}

export async function getProfileById(id: string): Promise<IProfile | null> {
  await connectDB();
  return Profile.findById(id).lean();
}

export async function getProfileBySlug(slug: string): Promise<IProfile | null> {
  await connectDB();
  return Profile.findOne({ slug }).lean();
}

export async function createProfile(data: {
  name: string;
  slug: string;
  description: string;
  permissions: string[];
}): Promise<IProfile> {
  await connectDB();
  return Profile.create(data);
}

export async function updateProfile(
  id: string,
  data: {
    name?: string;
    description?: string;
    permissions?: string[];
  }
): Promise<IProfile | null> {
  await connectDB();
  return Profile.findByIdAndUpdate(id, data, { new: true }).lean();
}
