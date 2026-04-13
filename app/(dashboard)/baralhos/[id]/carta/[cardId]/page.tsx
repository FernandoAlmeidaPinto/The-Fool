import { CardAnnotationsViewer } from "@/components/card-annotations-viewer";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import { parseAspectRatio } from "@/lib/decks/constants";
import { getCardFromDeck } from "@/lib/decks/service";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getImageUrl } from "@/lib/storage/s3";

interface Props {
  params: Promise<{ id: string; cardId: string }>;
}

export default async function CardDetailPage({ params }: Props) {
  const { id, cardId } = await params;
  const result = await getCardFromDeck(id, cardId);

  if (!result) notFound();

  const { deck, card, prevCard, nextCard } = result;

  const annotations = (card.annotations ?? []).map(
    (a: {
      _id: { toString(): string };
      x: number;
      y: number;
      title: string;
      description: string;
      order: number;
    }) => ({
      _id: a._id.toString(),
      x: a.x,
      y: a.y,
      title: a.title,
      description: a.description,
      order: a.order,
    }),
  );

  const hasAnnotations = annotations.length > 0;

  return (
    <div
      className={`mx-auto space-y-6 ${hasAnnotations ? "max-w-3xl" : "max-w-lg"}`}
    >
      <Link
        href={`/baralhos/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Voltar para {deck.name}
      </Link>

      <div className="flex flex-col items-center gap-4">
        <h2 className="text-2xl font-semibold text-center">{card.title}</h2>

        {card.description && (
          <RichTextViewer
            content={card.description}
            className="text-muted-foreground text-center"
          />
        )}
        {hasAnnotations ? (
          <CardAnnotationsViewer
            image={getImageUrl(card.image)!}
            aspectRatio={parseAspectRatio(deck.cardAspectRatio).cssValue}
            annotations={annotations}
          />
        ) : (
          <div
            className="relative max-w-sm max-h-96 rounded-lg overflow-hidden bg-muted shadow-md"
            style={{
              aspectRatio: parseAspectRatio(deck.cardAspectRatio).cssValue,
            }}
          >
            {card.image ? (
              <img
                src={getImageUrl(card.image)!}
                alt={card.title}
                className="object-contain w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Sem imagem
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 pt-2">
        {prevCard ? (
          <Link
            href={`/baralhos/${id}/carta/${prevCard._id.toString()}`}
            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {prevCard.title}
          </Link>
        ) : (
          <div />
        )}

        {nextCard ? (
          <Link
            href={`/baralhos/${id}/carta/${nextCard._id.toString()}`}
            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors ml-auto"
          >
            {nextCard.title}
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
