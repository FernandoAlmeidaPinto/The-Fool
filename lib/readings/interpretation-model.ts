import mongoose, { Schema, models, model } from "mongoose";
import type { Model } from "mongoose";

export interface IUserInterpretation {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  deckId: mongoose.Types.ObjectId;
  cardIds: mongoose.Types.ObjectId[];
  cardKey: string;
  context: string;
  answer: string;
  combinationId: mongoose.Types.ObjectId;
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
    answer: { type: String, required: true },
    combinationId: { type: Schema.Types.ObjectId, ref: "CardCombination", required: true },
  },
  { timestamps: true }
);

UserInterpretationSchema.index({ userId: 1, createdAt: -1 });

export const UserInterpretation: Model<IUserInterpretation> =
  models.UserInterpretation ?? model<IUserInterpretation>("UserInterpretation", UserInterpretationSchema);
