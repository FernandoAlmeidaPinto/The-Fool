import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { DiaryEntry, type IDiaryEntry, type DiaryEntryType } from "./model";
import { DailyCard } from "@/lib/daily-card/model";
import { UserInterpretation } from "@/lib/readings/interpretation-model";

export async function createEntry(data: {
  userId: string;
  type: DiaryEntryType;
  title?: string | null;
  body: string;
  dailyCardId?: string | null;
  interpretationId?: string | null;
}): Promise<IDiaryEntry> {
  await connectDB();

  const { userId, type, title, body, dailyCardId, interpretationId } = data;

  const trimmedBody = body.trim();
  if (!trimmedBody) {
    throw new Error("O texto da reflexão não pode ser vazio");
  }
  if (trimmedBody.length > 10000) {
    throw new Error("O texto da reflexão excede o limite de 10.000 caracteres");
  }

  const trimmedTitle = title?.trim() || null;
  if (trimmedTitle && trimmedTitle.length > 200) {
    throw new Error("O título excede o limite de 200 caracteres");
  }

  if (type === "daily-card") {
    if (!dailyCardId) throw new Error("dailyCardId é obrigatório para tipo carta-do-dia");
    if (interpretationId) throw new Error("interpretationId não é permitido para tipo carta-do-dia");
    const dc = await DailyCard.findOne({ _id: dailyCardId, userId }).lean();
    if (!dc) throw new Error("Carta do dia não encontrada");
  } else if (type === "reading") {
    if (!interpretationId) throw new Error("interpretationId é obrigatório para tipo leitura");
    if (dailyCardId) throw new Error("dailyCardId não é permitido para tipo leitura");
    const interp = await UserInterpretation.findOne({ _id: interpretationId, userId }).lean();
    if (!interp) throw new Error("Leitura não encontrada");
  } else {
    if (dailyCardId) throw new Error("dailyCardId não é permitido para tipo livre");
    if (interpretationId) throw new Error("interpretationId não é permitido para tipo livre");
  }

  const entry = await DiaryEntry.create({
    userId: new mongoose.Types.ObjectId(userId),
    type,
    title: trimmedTitle,
    body: trimmedBody,
    dailyCardId: dailyCardId ? new mongoose.Types.ObjectId(dailyCardId) : null,
    interpretationId: interpretationId ? new mongoose.Types.ObjectId(interpretationId) : null,
    archivedAt: null,
  });

  return entry.toObject();
}

export async function listEntries(
  userId: string,
  { page = 1, pageSize = 20, archived = false }: { page?: number; pageSize?: number; archived?: boolean } = {}
): Promise<{ entries: IDiaryEntry[]; total: number; page: number; pageSize: number }> {
  await connectDB();
  const skip = (page - 1) * pageSize;
  const filter = { userId, archivedAt: archived ? { $ne: null } : null };
  const [entries, total] = await Promise.all([
    DiaryEntry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    DiaryEntry.countDocuments(filter),
  ]);
  return { entries, total, page, pageSize };
}

export async function getEntryById(userId: string, entryId: string): Promise<IDiaryEntry | null> {
  await connectDB();
  return DiaryEntry.findOne({ _id: entryId, userId }).lean();
}

export async function archiveEntry(userId: string, entryId: string): Promise<IDiaryEntry | null> {
  await connectDB();
  return DiaryEntry.findOneAndUpdate(
    { _id: entryId, userId, archivedAt: null },
    { $set: { archivedAt: new Date() } },
    { new: true }
  ).lean();
}

export async function unarchiveEntry(userId: string, entryId: string): Promise<IDiaryEntry | null> {
  await connectDB();
  return DiaryEntry.findOneAndUpdate(
    { _id: entryId, userId, archivedAt: { $ne: null } },
    { $set: { archivedAt: null } },
    { new: true }
  ).lean();
}

export async function findEntryFor(
  userId: string,
  ref: { dailyCardId?: string; interpretationId?: string }
): Promise<IDiaryEntry | null> {
  await connectDB();
  if (ref.dailyCardId) {
    return DiaryEntry.findOne({ userId, dailyCardId: ref.dailyCardId }).lean();
  }
  if (ref.interpretationId) {
    return DiaryEntry.findOne({ userId, interpretationId: ref.interpretationId }).lean();
  }
  return null;
}
