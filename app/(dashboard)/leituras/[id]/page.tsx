import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect, notFound } from "next/navigation";
import { getInterpretationById, getCombinationById } from "@/lib/readings/service";
import { getDeckById } from "@/lib/decks/service";
import { parseAspectRatio } from "@/lib/decks/constants";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReadingResultPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.READINGS_VIEW)) {
    redirect("/");
  }

  const { id } = await params;
  const interpretation = await getInterpretationById(id);
  if (!interpretation) notFound();

  // Verify ownership
  if (interpretation.userId.toString() !== session.user.id) {
    notFound();
  }

  const [combination, deck] = await Promise.all([
    getCombinationById(interpretation.combinationId.toString()),
    getDeckById(interpretation.deckId.toString()),
  ]);

  if (!deck) notFound();

  // Resolve card data from deck subdocuments
  const cards = interpretation.cardIds.map((cardId) => {
    const card = deck.cards.find((c) => c._id.toString() === cardId.toString());
    return card
      ? { _id: card._id.toString(), title: card.title, image: card.image }
      : { _id: cardId.toString(), title: "Carta removida", image: "" };
  });

  const aspectRatio = parseAspectRatio(deck.cardAspectRatio).cssValue;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/leituras"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Voltar para Leituras
      </Link>

      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold text-foreground">
            {interpretation.mode === "practice" ? "Seu Treino" : "Sua Leitura"}
          </h2>
          {interpretation.mode === "practice" && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Treino
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{deck.name}</p>
      </div>

      {/* Selected cards */}
      <div className="flex gap-3 flex-wrap">
        {cards.map((card, i) => (
          <div key={card._id} className="flex flex-col items-center gap-1 w-20">
            <div className="relative">
              <div
                className="overflow-hidden rounded-md bg-muted"
                style={{ aspectRatio, width: "80px" }}
              >
                {card.image ? (
                  <img
                    src={card.image}
                    alt={card.title}
                    className="object-contain w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                    ?
                  </div>
                )}
              </div>
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {i + 1}
              </span>
            </div>
            <span className="text-xs text-center font-medium leading-tight">
              {card.title}
            </span>
          </div>
        ))}
      </div>

      {interpretation.mode === "practice" ? (
        <>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium mb-1">Pergunta de treino:</p>
            <p className="text-sm text-muted-foreground italic">
              &quot;{interpretation.context}&quot;
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Sua resposta</h3>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm whitespace-pre-wrap break-words">
                {interpretation.userAnswer ?? ""}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Feedback</h3>
            <div className="rounded-lg border border-border p-4">
              <RichTextViewer
                content={interpretation.feedback ?? ""}
                className="text-sm"
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium mb-1">Sua pergunta:</p>
            <p className="text-sm text-muted-foreground italic">
              &quot;{interpretation.context}&quot;
            </p>
          </div>

          {combination && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Relação entre as cartas</h3>
              <div className="rounded-lg border border-border p-4">
                <RichTextViewer
                  content={combination.answer}
                  className="text-sm"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Interpretação para você</h3>
            <div className="rounded-lg border border-border p-4">
              <RichTextViewer
                content={interpretation.answer ?? ""}
                className="text-sm"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
