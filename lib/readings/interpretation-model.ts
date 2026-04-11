import mongoose, { Schema, models, model } from "mongoose";
import type { Model } from "mongoose";

export type InterpretationMode = "normal" | "practice";

export interface IUserInterpretation {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  deckId: mongoose.Types.ObjectId;
  cardIds: mongoose.Types.ObjectId[];
  cardKey: string;
  context: string;
  answer?: string;
  combinationId: mongoose.Types.ObjectId;
  mode: InterpretationMode;
  userAnswer?: string;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserInterpretationSchema = new Schema<IUserInterpretation>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    deckId: { type: Schema.Types.ObjectId, required: true },
    cardIds: { type: [Schema.Types.ObjectId], required: true },
    cardKey: { type: String, required: true },
    context: { type: String, required: true },
    answer: { type: String, required: false },
    combinationId: {
      type: Schema.Types.ObjectId,
      ref: "CardCombination",
      required: true,
    },
    mode: {
      type: String,
      enum: ["normal", "practice"],
      default: "normal",
      required: true,
    },
    userAnswer: { type: String, required: false },
    feedback: { type: String, required: false },
  },
  { timestamps: true }
);

UserInterpretationSchema.index({ userId: 1, createdAt: -1 });

export const UserInterpretation: Model<IUserInterpretation> =
  models.UserInterpretation ??
  model<IUserInterpretation>("UserInterpretation", UserInterpretationSchema);
