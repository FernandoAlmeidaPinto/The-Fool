import type { AIProvider, CardData } from "./provider";

export class MockProvider implements AIProvider {
  async generateCombination(cards: CardData[]): Promise<string> {
    const titles = cards.map((c) => c.title).join(", ");
    return `<p>Esta é uma análise da combinação entre as cartas: <strong>${titles}</strong>.</p><p>Juntas, essas cartas sugerem um caminho de transformação e descoberta interior. A energia combinada aponta para um momento de reflexão e crescimento pessoal.</p>`;
  }

  async generateInterpretation(
    cards: CardData[],
    combination: string,
    context: string
  ): Promise<string> {
    const titles = cards.map((c) => c.title).join(", ");
    return `<p>Considerando sua pergunta: <em>"${context}"</em></p><p>As cartas <strong>${titles}</strong> indicam que este é um momento propício para confiar na sua intuição. O contexto que você trouxe ressoa com a energia dessa combinação, sugerindo que as respostas que busca já estão dentro de você.</p>`;
  }
}
