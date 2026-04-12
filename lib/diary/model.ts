import mongoose, { Schema, models, model } from "mongoose";
import type { Model } from "mongoose";

export type DiaryEntryType = "daily-card" | "reading" | "free";

export interface IDiaryEntry {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: DiaryEntryType;
  title: string | null;
  body: string;
  dailyCardId: mongoose.Types.ObjectId | null;
  interpretationId: mongoose.Types.ObjectId | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const DiaryEntrySchema = new Schema<IDiaryEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["daily-card", "reading", "free"],
      required: true,
    },
    title: { type: String, default: null, maxlength: 200 },
    body: { type: String, required: true, maxlength: 10000 },
    dailyCardId: {
      type: Schema.Types.ObjectId,
      ref: "DailyCard",
      default: null,
    },
    interpretationId: {
      type: Schema.Types.ObjectId,
      ref: "UserInterpretation",
      default: null,
    },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Paginated timeline filtered by archive status
DiaryEntrySchema.index({ userId: 1, archivedAt: 1, createdAt: -1 });
// Fast lookup: "did I already reflect on this daily card?"
DiaryEntrySchema.index({ userId: 1, dailyCardId: 1 });
// Fast lookup: "did I already reflect on this reading?"
DiaryEntrySchema.index({ userId: 1, interpretationId: 1 });

export const DiaryEntry: Model<IDiaryEntry> =
  models.DiaryEntry ?? model<IDiaryEntry>("DiaryEntry", DiaryEntrySchema);
