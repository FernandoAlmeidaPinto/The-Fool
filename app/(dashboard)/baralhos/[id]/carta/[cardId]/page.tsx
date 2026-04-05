import Link from "next/link";
import { notFound } from "next/navigation";
import { getCardFromDeck } from "@/lib/decks/service";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  params: Promise<{ id: string; cardId: string }>;
}

export default async function CardDetailPage({ params }: Props) {
  const { id, cardId } = await params;
  const result = await getCardFromDeck(id, cardId);

  if (!result) notFound();

  const { deck, card, prevCard, nextCard } = result;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link
        href={`/baralhos/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Voltar para {deck.name}
      </Link>

      <div className="flex flex-col items-center gap-4">
        <div className="relative w-full max-w-sm aspect-[2/3] rounded-lg overflow-hidden bg-muted shadow-md">
          {card.image ? (
            <img
              src={card.image}
              alt={card.title}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Sem imagem
            </div>
          )}
        </div>

        <h2 className="text-2xl font-semibold text-center">{card.title}</h2>

        {card.description && (
          <p className="text-muted-foreground text-center whitespace-pre-wrap">
            {card.description}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 pt-2">
        {prevCard ? (
          <Link
            href={`/baralhos/${id}/carta/${prevCard._id.toString()}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {prevCard.title}
          </Link>
        ) : (
          <div />
        )}

        {nextCard ? (
          <Link
            href={`/baralhos/${id}/carta/${nextCard._id.toString()}`}
            className={cn(buttonVariants({ variant: "outline" }), "ml-auto")}
          >
            {nextCard.title}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
