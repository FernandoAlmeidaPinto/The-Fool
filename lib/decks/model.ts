import mongoose, { Schema, models, model } from "mongoose";
import type { Model } from "mongoose";

export interface ICard extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  image: string;
  order: number;
}

const CardSchema = new Schema<ICard>({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  image: { type: String, required: true },
  order: { type: Number, required: true, default: 0 },
});

export interface IDeck {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  type: string;
  cardAspectRatio: string;
  coverImage: string | null;
  cards: mongoose.Types.DocumentArray<ICard>;
  createdAt: Date;
  updatedAt: Date;
}

const DeckSchema = new Schema<IDeck>(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    type: {
      type: String,
      enum: ["tarot", "lenormand", "oracle"],
      required: true,
    },
    cardAspectRatio: { type: String, default: "2/3" },
    coverImage: { type: String, default: null },
    cards: { type: [CardSchema], default: [] },
  },
  { timestamps: true }
);

export const Deck: Model<IDeck> =
  models.Deck ?? model<IDeck>("Deck", DeckSchema);
