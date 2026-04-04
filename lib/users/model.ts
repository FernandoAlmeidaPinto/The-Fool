import mongoose, { Schema, models, model } from "mongoose";
import type { Model } from "mongoose";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  emailVerified: Date | null;
  password?: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    emailVerified: { type: Date, default: null },
    password: { type: String, select: false },
    image: { type: String, default: null },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  models.User ?? model<IUser>("User", UserSchema);
