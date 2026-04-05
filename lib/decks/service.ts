import { connectDB } from "@/lib/db/mongoose";
import { Deck } from "./model";
import type { IDeck, ICard } from "./model";

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
}): Promise<IDeck> {
  await connectDB();
  return Deck.create(data);
}

export async function updateDeck(
  id: string,
  data: { name?: string; description?: string; type?: string }
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
