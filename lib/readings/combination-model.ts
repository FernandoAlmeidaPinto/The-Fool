import mongoose, { Schema, models, model } from "mongoose";
import type { Model } from "mongoose";

export interface ICardCombination {
  _id: mongoose.Types.ObjectId;
  deckId: mongoose.Types.ObjectId;
  cardIds: mongoose.Types.ObjectId[];
  cardKey: string;
  answer: string;
  status: "generated" | "reviewed";
  source: "ai" | "manual";
  createdAt: Date;
  updatedAt: Date;
}

const CardCombinationSchema = new Schema<ICardCombination>(
  {
    deckId: { type: Schema.Types.ObjectId, required: true },
    cardIds: { type: [Schema.Types.ObjectId], required: true },
    cardKey: { type: String, required: true },
    answer: { type: String, required: true },
    status: {
      type: String,
      enum: ["generated", "reviewed"],
      default: "generated",
    },
    source: {
      type: String,
      enum: ["ai", "manual"],
      default: "ai",
    },
  },
  { timestamps: true }
);

CardCombinationSchema.index({ deckId: 1, cardKey: 1 }, { unique: true });

export const CardCombination: Model<ICardCombination> =
  models.CardCombination ?? model<ICardCombination>("CardCombination", CardCombinationSchema);
