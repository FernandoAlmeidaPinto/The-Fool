import mongoose, { Schema, models, model } from "mongoose";
import type { Model } from "mongoose";

export interface IPracticeQuestion {
  _id: mongoose.Types.ObjectId;
  text: string;
  deckId: mongoose.Types.ObjectId | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PracticeQuestionSchema = new Schema<IPracticeQuestion>(
  {
    text: { type: String, required: true, trim: true },
    deckId: {
      type: Schema.Types.ObjectId,
      ref: "Deck",
      default: null,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PracticeQuestionSchema.index({ active: 1, deckId: 1 });

export const PracticeQuestion: Model<IPracticeQuestion> =
  models.PracticeQuestion ??
  model<IPracticeQuestion>("PracticeQuestion", PracticeQuestionSchema);
