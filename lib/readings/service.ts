import { connectDB } from "@/lib/db/mongoose";
import { Deck } from "@/lib/decks/model";
import { CardCombination } from "./combination-model";
import type { ICardCombination } from "./combination-model";
import { UserInterpretation } from "./interpretation-model";
import { getAIProvider } from "@/lib/ai/provider";
import type { CardData } from "@/lib/ai/provider";
import type { IUserInterpretation } from "./interpretation-model";

function buildCardKey(cardIds: string[]): string {
  return cardIds.map((id) => id.toString()).join("_");
}

export async function createReading(data: {
  userId: string;
  deckId: string;
  cardIds: string[];
  context: string;
}): Promise<IUserInterpretation> {
  await connectDB();

  const { userId, deckId, cardIds, context } = data;

  // Validate context
  if (!context.trim()) {
    throw new Error("Contexto é obrigatório");
  }

  // Validate card count
  if (cardIds.length < 2 || cardIds.length > 5) {
    throw new Error("Selecione entre 2 e 5 cartas");
  }

  // Fetch deck and validate cards exist
  const deck = await Deck.findById(deckId).lean();
  if (!deck) throw new Error("Baralho não encontrado");

  const deckCardIds = new Set(deck.cards.map((c) => c._id.toString()));
  for (const cardId of cardIds) {
    if (!deckCardIds.has(cardId)) {
      throw new Error("Uma ou mais cartas não pertencem a este baralho");
    }
  }

  // Build card data for AI provider
  const cards: CardData[] = cardIds.map((cardId) => {
    const card = deck.cards.find((c) => c._id.toString() === cardId)!;
    return {
      _id: card._id.toString(),
      title: card.title,
      description: card.description,
    };
  });

  const cardKey = buildCardKey(cardIds);
  const provider = getAIProvider();

  // Find or create card combination
  let combination = await CardCombination.findOne({ deckId, cardKey }).lean();

  if (!combination) {
    const answer = await provider.generateCombination(cards);
    // Upsert to handle concurrent requests for same combination
    combination = await CardCombination.findOneAndUpdate(
      { deckId, cardKey },
      {
        $setOnInsert: {
          deckId,
          cardIds,
          cardKey,
          answer,
          status: "generated",
          source: "ai",
        },
      },
      { upsert: true, new: true }
    ).lean();

    if (!combination) {
      throw new Error("Falha ao criar combinação de cartas");
    }
  }

  // Generate contextual interpretation (always new)
  const interpretationAnswer = await provider.generateInterpretation(
    cards,
    combination.answer,
    context
  );

  // Save user interpretation
  const interpretation = await UserInterpretation.create({
    userId,
    deckId,
    cardIds,
    cardKey,
    context,
    answer: interpretationAnswer,
    combinationId: combination._id,
  });

  return interpretation.toObject();
}

export async function getInterpretationById(
  id: string
): Promise<IUserInterpretation | null> {
  await connectDB();
  return UserInterpretation.findById(id).lean();
}

export async function getCombinationById(
  id: string
): Promise<ICardCombination | null> {
  await connectDB();
  return CardCombination.findById(id).lean();
}

export async function listUserInterpretations(
  userId: string,
  page: number = 1,
  perPage: number = 10
): Promise<{ items: IUserInterpretation[]; total: number }> {
  await connectDB();

  const skip = (page - 1) * perPage;

  const [items, total] = await Promise.all([
    UserInterpretation.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean(),
    UserInterpretation.countDocuments({ userId }),
  ]);

  return { items, total };
}

export async function listCombinationsByDeck(
  deckId: string
): Promise<ICardCombination[]> {
  await connectDB();
  return CardCombination.find({ deckId })
    .sort({ status: 1, createdAt: -1 })
    .lean();
}

export async function countPendingCombinations(
  deckId: string
): Promise<number> {
  await connectDB();
  return CardCombination.countDocuments({ deckId, status: "generated" });
}

export async function reviewCombination(
  id: string,
  answer?: string
): Promise<ICardCombination | null> {
  await connectDB();

  const update: Record<string, unknown> = { status: "reviewed" };
  if (answer !== undefined) {
    update.answer = answer;
    update.source = "manual";
  }

  return CardCombination.findByIdAndUpdate(id, update, { new: true }).lean();
}
