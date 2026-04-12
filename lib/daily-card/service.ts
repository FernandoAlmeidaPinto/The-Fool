import mongoose from "mongoose";
import { MongoServerError } from "mongodb";
import { connectDB } from "@/lib/db/mongoose";
import { DailyCard, type IDailyCard } from "./model";
import { dateInSaoPaulo } from "./date";
import {
  getActiveDailyDeck,
  getDeckById,
  setCardDailyReflection,
} from "@/lib/decks/service";
import type { IDeck, ICard } from "@/lib/decks/model";
import { getAIProvider } from "@/lib/ai/provider";

function pickRandomCard(cards: ICard[]): ICard | null {
  if (cards.length === 0) return null;
  return cards[Math.floor(Math.random() * cards.length)];
}

/**
 * Single entry point for the daily card feature. Idempotent: called by
 * both the dashboard widget and the dedicated page any number of times.
 *
 * - Returns the existing DailyCard for today if one exists.
 * - Otherwise draws a random card from the active daily deck, lazily
 *   generates a reflection (cached on the Card subdoc), and persists
 *   a new DailyCard.
 * - Returns null if no deck is currently flagged as the daily deck
 *   (or the flagged deck is empty).
 */
export async function getOrCreateToday(
  userId: string
): Promise<IDailyCard | null> {
  await connectDB();
  const today = dateInSaoPaulo();

  const existing = await DailyCard.findOne({ userId, date: today }).lean();
  if (existing) return existing;

  const activeDeck = await getActiveDailyDeck();
  if (!activeDeck) return null;

  const card = pickRandomCard(activeDeck.cards as unknown as ICard[]);
  if (!card) return null;

  // Lazy reflection generation — one AI call per card, ever.
  if (!card.dailyReflection) {
    try {
      const ai = getAIProvider();
      const reflection = await ai.generateDailyCardReflection({
        _id: card._id.toString(),
        title: card.title,
        description: card.description,
      });
      await setCardDailyReflection(
        activeDeck._id.toString(),
        card._id.toString(),
        reflection
      );
    } catch (err) {
      // Non-fatal: the DailyCard is still created below; reflection stays
      // null and a later draw of the same card will retry.
      console.error("[daily-card] reflection generation failed", err);
    }
  }

  try {
    const created = await DailyCard.create({
      userId: new mongoose.Types.ObjectId(userId),
      date: today,
      deckId: activeDeck._id,
      cardId: card._id,
      cardSnapshot: { name: card.title, imageUrl: card.image },
      revealedAt: null,
    });
    return created.toObject();
  } catch (err) {
    // Duplicate key: lost a race with a concurrent first-visit. Re-read.
    if (err instanceof MongoServerError && err.code === 11000) {
      return DailyCard.findOne({ userId, date: today }).lean();
    }
    throw err;
  }
}

export async function markRevealed(
  userId: string,
  date: string
): Promise<void> {
  await connectDB();
  await DailyCard.updateOne(
    { userId, date, revealedAt: null },
    { $set: { revealedAt: new Date() } }
  );
}

export async function getHistory(
  userId: string,
  { page = 1, pageSize = 30 }: { page?: number; pageSize?: number } = {}
): Promise<{ items: IDailyCard[]; total: number; page: number; pageSize: number }> {
  await connectDB();
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    DailyCard.find({ userId }).sort({ date: -1 }).skip(skip).limit(pageSize).lean(),
    DailyCard.countDocuments({ userId }),
  ]);
  return { items, total, page, pageSize };
}

export async function getByDate(
  userId: string,
  date: string
): Promise<IDailyCard | null> {
  await connectDB();
  return DailyCard.findOne({ userId, date }).lean();
}

export async function getDailyCardById(
  dailyCardId: string
): Promise<IDailyCard | null> {
  await connectDB();
  return DailyCard.findById(dailyCardId).lean();
}

/**
 * Resolves the live card (deck + subdoc) for a stored DailyCard record.
 * Returns null if either the deck or the card no longer exists — in that
 * case callers should fall back to `dailyCard.cardSnapshot`.
 */
export async function resolveLiveCard(
  dailyCard: IDailyCard
): Promise<{ deck: IDeck; card: ICard } | null> {
  const deck = await getDeckById(dailyCard.deckId.toString());
  if (!deck) return null;
  const card = deck.cards.find(
    (c) => c._id.toString() === dailyCard.cardId.toString()
  );
  if (!card) return null;
  return { deck, card: card as ICard };
}
