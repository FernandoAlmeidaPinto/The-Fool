import mongoose, { Schema, models, model } from "mongoose";
import type { Model } from "mongoose";

export interface IProfile {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  permissions: string[];
  readingsMonthlyLimit: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const ProfileSchema = new Schema<IProfile>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    permissions: { type: [String], default: [] },
    readingsMonthlyLimit: { type: Number, default: null },
  },
  { timestamps: true }
);

export const Profile: Model<IProfile> =
  models.Profile ?? model<IProfile>("Profile", ProfileSchema);
