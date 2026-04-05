import mongoose, { Schema, models, model } from "mongoose";
import type { Model } from "mongoose";

export interface ISubscription {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  status: "active" | "expired" | "cancelled";
  startsAt: Date;
  renewsAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    planId: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
    profileId: { type: Schema.Types.ObjectId, ref: "Profile", required: true },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
    startsAt: { type: Date, required: true },
    renewsAt: { type: Date, required: true },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ userId: 1, status: 1 });

export const Subscription: Model<ISubscription> =
  models.Subscription ?? model<ISubscription>("Subscription", SubscriptionSchema);
