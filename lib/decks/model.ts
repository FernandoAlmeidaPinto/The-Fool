import mongoose, { Schema, models, model } from "mongoose";
import type { Model } from "mongoose";

export interface IAnnotation {
  _id: mongoose.Types.ObjectId;
  x: number;
  y: number;
  title: string;
  description: string;
  order: number;
}

const AnnotationSchema = new Schema<IAnnotation>({
  x: { type: Number, required: true, min: 0, max: 100 },
  y: { type: Number, required: true, min: 0, max: 100 },
  title: { type: String, required: true, maxlength: 80 },
  description: { type: String, default: "", maxlength: 2000 },
  order: { type: Number, required: true, default: 0 },
});

export interface ICard extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  image: string;
  order: number;
  annotations: mongoose.Types.DocumentArray<IAnnotation>;
}

const CardSchema = new Schema<ICard>({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  image: { type: String, required: true },
  order: { type: Number, required: true, default: 0 },
  annotations: { type: [AnnotationSchema], default: [] },
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
