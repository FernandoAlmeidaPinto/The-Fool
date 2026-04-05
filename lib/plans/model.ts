import mongoose, { Schema, models, model } from "mongoose";
import type { Model } from "mongoose";

export interface IPlan {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  profileId: mongoose.Types.ObjectId;
  active: boolean;
  readingsMonthlyLimit: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    currency: { type: String, default: "BRL" },
    interval: {
      type: String,
      enum: ["monthly", "yearly", "one_time"],
      default: "monthly",
    },
    profileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },
    active: { type: Boolean, default: true },
    readingsMonthlyLimit: { type: Number, default: null },
  },
  { timestamps: true }
);

export const Plan: Model<IPlan> =
  models.Plan ?? model<IPlan>("Plan", PlanSchema);
