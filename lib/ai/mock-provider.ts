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

  async generatePracticeFeedback(
    cards: CardData[],
    baseCombination: string | null,
    questionText: string,
    userAnswer: string
  ): Promise<string> {
    const titles = cards.map((c) => c.title).join(", ");
    const base = baseCombination ? " (considerando a combinação base)" : "";
    return `<p><strong>Feedback sobre sua interpretação</strong>${base}:</p><p>Você trouxe boas conexões entre as cartas <strong>${titles}</strong> ao responder <em>"${questionText}"</em>. Um ponto forte da sua resposta foi o esforço de costurar uma narrativa — ${userAnswer.length} caracteres mostram dedicação. Como sugestão, tente explorar mais os símbolos individuais de cada carta antes de fechar a leitura conjunta.</p>`;
  }

  async generateDailyCardReflection(card: CardData): Promise<string> {
    return `<p>A carta <strong>${card.title}</strong> convida você a fazer uma pausa e olhar para dentro. Respire fundo e permita que a sua mensagem atravesse o dia com você.</p><p>Deixe que o símbolo desta carta seja um farol silencioso nas pequenas escolhas de hoje.</p>`;
  }
}
