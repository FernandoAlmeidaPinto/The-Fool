export interface CardData {
  _id: string;
  title: string;
  description: string;
}

export interface AIProvider {
  generateCombination(cards: CardData[]): Promise<string>;
  generateInterpretation(
    cards: CardData[],
    combination: string,
    context: string
  ): Promise<string>;
  generatePracticeFeedback(
    cards: CardData[],
    baseCombination: string | null,
    questionText: string,
    userAnswer: string
  ): Promise<string>;
  generateDailyCardReflection(card: CardData): Promise<string>;
}

import { MockProvider } from "./mock-provider";

export function getAIProvider(): AIProvider {
  const providerName = process.env.AI_PROVIDER ?? "mock";

  switch (providerName) {
    case "mock":
      return new MockProvider();
    default:
      throw new Error(`Unknown AI provider: ${providerName}`);
  }
}
