import { connectDB } from "@/lib/db/mongoose";
import { Deck } from "./model";
import type { IDeck, ICard, IAnnotation } from "./model";

export async function listDecks(): Promise<IDeck[]> {
  await connectDB();
  return Deck.find().sort({ name: 1 }).lean();
}

export async function getDeckById(id: string): Promise<IDeck | null> {
  await connectDB();
  return Deck.findById(id).lean();
}

export async function createDeck(data: {
  name: string;
  description: string;
  type: string;
  cardAspectRatio?: string;
  coverImage?: string;
}): Promise<IDeck> {
  await connectDB();
  return Deck.create(data);
}

export async function updateDeck(
  id: string,
  data: { name?: string; description?: string; type?: string; cardAspectRatio?: string; coverImage?: string }
): Promise<IDeck | null> {
  await connectDB();
  return Deck.findByIdAndUpdate(id, data, { new: true }).lean();
}

export async function addCard(
  deckId: string,
  data: { title: string; description: string; image: string }
): Promise<ICard> {
  await connectDB();
  const deck = await Deck.findById(deckId);
  if (!deck) throw new Error("Deck not found");

  const maxOrder = deck.cards.reduce((max, c) => Math.max(max, c.order), -1);
  const card = { ...data, order: maxOrder + 1 };
  deck.cards.push(card as ICard);
  await deck.save();

  return deck.cards[deck.cards.length - 1].toObject();
}

export async function updateCard(
  deckId: string,
  cardId: string,
  data: { title?: string; description?: string; image?: string }
): Promise<ICard | null> {
  await connectDB();
  const deck = await Deck.findById(deckId);
  if (!deck) return null;

  const card = deck.cards.id(cardId);
  if (!card) return null;

  if (data.title !== undefined) card.title = data.title;
  if (data.description !== undefined) card.description = data.description;
  if (data.image !== undefined) card.image = data.image;

  await deck.save();
  return card.toObject();
}

export async function addAnnotation(
  deckId: string,
  cardId: string,
  data: { x: number; y: number; title: string; description: string }
): Promise<IAnnotation> {
  await connectDB();
  const deck = await Deck.findById(deckId);
  if (!deck) throw new Error("Deck não encontrado");
  const card = deck.cards.id(cardId);
  if (!card) throw new Error("Carta não encontrada");
  const maxOrder = card.annotations?.reduce((max: number, a: IAnnotation) => Math.max(max, a.order), -1) ?? -1;
  card.annotations.push({ ...data, order: maxOrder + 1 } as IAnnotation);
  await deck.save();
  return card.annotations[card.annotations.length - 1].toObject();
}

export async function updateAnnotation(
  deckId: string,
  cardId: string,
  annotationId: string,
  data: { x?: number; y?: number; title?: string; description?: string }
): Promise<IAnnotation | null> {
  await connectDB();
  const deck = await Deck.findById(deckId);
  if (!deck) return null;
  const card = deck.cards.id(cardId);
  if (!card) return null;
  const annotation = card.annotations.id(annotationId);
  if (!annotation) return null;
  if (data.x !== undefined) annotation.x = data.x;
  if (data.y !== undefined) annotation.y = data.y;
  if (data.title !== undefined) annotation.title = data.title;
  if (data.description !== undefined) annotation.description = data.description;
  await deck.save();
  return annotation.toObject();
}

export async function deleteAnnotation(
  deckId: string,
  cardId: string,
  annotationId: string
): Promise<boolean> {
  await connectDB();
  const deck = await Deck.findById(deckId);
  if (!deck) return false;
  const card = deck.cards.id(cardId);
  if (!card) return false;
  const annotation = card.annotations.id(annotationId);
  if (!annotation) return false;
  annotation.deleteOne();
  await deck.save();
  return true;
}

export async function getActiveDailyDeck(): Promise<IDeck | null> {
  await connectDB();
  return Deck.findOne({ availableForDailyCard: true }).lean();
}

/**
 * Marks one deck as the active daily deck, enforcing the "at most one
 * active at a time" invariant. Uses a single ordered bulkWrite so the
 * unset-all and set-one operations travel in one batch.
 *
 * Pass `deckId = null` to simply clear the flag (no active deck).
 */
export async function setAsDailyDeck(deckId: string | null): Promise<void> {
  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ops: any[] = [
    {
      updateMany: {
        filter: { availableForDailyCard: true },
        update: { $set: { availableForDailyCard: false } },
      },
    },
  ];
  if (deckId) {
    ops.push({
      updateOne: {
        filter: { _id: deckId },
        update: { $set: { availableForDailyCard: true } },
      },
    });
  }
  await Deck.bulkWrite(ops, { ordered: true });
}

export async function setCardDailyReflection(
  deckId: string,
  cardId: string,
  reflection: string
): Promise<boolean> {
  await connectDB();
  const result = await Deck.updateOne(
    { _id: deckId, "cards._id": cardId },
    { $set: { "cards.$.dailyReflection": reflection } }
  );
  return result.matchedCount > 0;
}

export async function getCardFromDeck(
  deckId: string,
  cardId: string
): Promise<{ deck: IDeck; card: ICard; prevCard: ICard | null; nextCard: ICard | null } | null> {
  await connectDB();
  const deck = await Deck.findById(deckId).lean();
  if (!deck) return null;

  const sortedCards = [...deck.cards].sort((a, b) => a.order - b.order);
  const idx = sortedCards.findIndex((c) => c._id.toString() === cardId);
  if (idx === -1) return null;

  return {
    deck,
    card: sortedCards[idx],
    prevCard: idx > 0 ? sortedCards[idx - 1] : null,
    nextCard: idx < sortedCards.length - 1 ? sortedCards[idx + 1] : null,
  };
}
