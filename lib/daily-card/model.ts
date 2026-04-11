import mongoose, { Schema, models, model } from "mongoose";
import type { Model } from "mongoose";

export interface IDailyCard {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: string; // "YYYY-MM-DD" in America/Sao_Paulo
  deckId: mongoose.Types.ObjectId;
  cardId: mongoose.Types.ObjectId;
  cardSnapshot: {
    name: string;
    imageUrl: string;
  };
  revealedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const DailyCardSchema = new Schema<IDailyCard>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    deckId: { type: Schema.Types.ObjectId, ref: "Deck", required: true },
    cardId: { type: Schema.Types.ObjectId, required: true },
    cardSnapshot: {
      name: { type: String, required: true },
      imageUrl: { type: String, required: true },
    },
    revealedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One draw per user per day — also protects against concurrent first-visit races.
DailyCardSchema.index({ userId: 1, date: 1 }, { unique: true });
// Feeds paginated history query.
DailyCardSchema.index({ userId: 1, date: -1 });

export const DailyCard: Model<IDailyCard> =
  models.DailyCard ?? model<IDailyCard>("DailyCard", DailyCardSchema);
