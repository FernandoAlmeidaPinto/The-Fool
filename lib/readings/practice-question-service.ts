import { connectDB } from "@/lib/db/mongoose";
import { PracticeQuestion } from "./practice-question-model";
import type { IPracticeQuestion } from "./practice-question-model";
import mongoose from "mongoose";

export interface ListPracticeQuestionsOptions {
  page?: number;
  perPage?: number;
  deckId?: string | null | "global" | "any";
  active?: boolean | "any";
}

export async function listPracticeQuestions(
  options: ListPracticeQuestionsOptions = {}
): Promise<{ items: IPracticeQuestion[]; total: number }> {
  await connectDB();

  const page = Math.max(1, options.page ?? 1);
  const perPage = options.perPage ?? 20;
  const skip = (page - 1) * perPage;

  const filter: Record<string, unknown> = {};

  if (options.deckId === "global") {
    filter.deckId = null;
  } else if (options.deckId && options.deckId !== "any") {
    filter.deckId = new mongoose.Types.ObjectId(options.deckId);
  }

  if (options.active === true || options.active === false) {
    filter.active = options.active;
  }

  const [items, total] = await Promise.all([
    PracticeQuestion.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean(),
    PracticeQuestion.countDocuments(filter),
  ]);

  return { items, total };
}

export async function getPracticeQuestionById(
  id: string
): Promise<IPracticeQuestion | null> {
  await connectDB();
  return PracticeQuestion.findById(id).lean();
}

export async function createPracticeQuestion(data: {
  text: string;
  deckId: string | null;
  active: boolean;
}): Promise<IPracticeQuestion> {
  await connectDB();

  const text = data.text.trim();
  if (!text) {
    throw new Error("Texto da pergunta é obrigatório");
  }

  return PracticeQuestion.create({
    text,
    deckId: data.deckId ? new mongoose.Types.ObjectId(data.deckId) : null,
    active: data.active,
  });
}

export async function updatePracticeQuestion(
  id: string,
  data: {
    text?: string;
    deckId?: string | null;
    active?: boolean;
  }
): Promise<IPracticeQuestion | null> {
  await connectDB();

  const update: Record<string, unknown> = {};

  if (data.text !== undefined) {
    const text = data.text.trim();
    if (!text) throw new Error("Texto da pergunta é obrigatório");
    update.text = text;
  }

  if (data.deckId !== undefined) {
    update.deckId = data.deckId
      ? new mongoose.Types.ObjectId(data.deckId)
      : null;
  }

  if (data.active !== undefined) {
    update.active = data.active;
  }

  return PracticeQuestion.findByIdAndUpdate(id, update, { new: true }).lean();
}

export async function deletePracticeQuestion(id: string): Promise<void> {
  await connectDB();
  await PracticeQuestion.findByIdAndDelete(id);
}

/**
 * Returns a random active practice question eligible for the given deck.
 * Eligibility: active AND (deckId = provided deckId OR deckId = null).
 * Returns null if no eligible question exists.
 *
 * The optional excludeId lets callers (e.g. "Sortear outra") avoid
 * drawing the same question twice in a row when multiple eligible
 * options are available. If excluding would leave the result set
 * empty, the exclusion is ignored.
 */
export async function drawRandomPracticeQuestion(
  deckId: string,
  excludeId?: string
): Promise<IPracticeQuestion | null> {
  await connectDB();

  const baseMatch: Record<string, unknown> = {
    active: true,
    $or: [
      { deckId: new mongoose.Types.ObjectId(deckId) },
      { deckId: null },
    ],
  };

  const eligibleTotal = await PracticeQuestion.countDocuments(baseMatch);
  if (eligibleTotal === 0) return null;

  const match: Record<string, unknown> = { ...baseMatch };
  if (excludeId && eligibleTotal > 1) {
    match._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
  }

  const [doc] = await PracticeQuestion.aggregate<IPracticeQuestion>([
    { $match: match },
    { $sample: { size: 1 } },
  ]);

  return doc ?? null;
}
