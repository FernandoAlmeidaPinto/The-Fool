import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getDeckById } from "@/lib/decks/service";
import { DECK_TYPE_LABELS, DeckType } from "@/lib/decks/constants";
import { Badge } from "@/components/ui/badge";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DeckPage({ params }: Props) {
  const { id } = await params;
  const deck = await getDeckById(id);

  if (!deck) notFound();

  const sortedCards = [...deck.cards].sort((a, b) => a.order - b.order);

  return (
    <div>
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-2xl font-semibold text-foreground">{deck.name}</h2>
          <Badge variant="secondary">
            {DECK_TYPE_LABELS[deck.type as DeckType] ?? deck.type}
          </Badge>
        </div>
        {deck.description && (
          <p className="text-muted-foreground">{deck.description}</p>
        )}
      </div>

      {sortedCards.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma carta neste baralho.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedCards.map((card) => (
            <Link
              key={card._id.toString()}
              href={`/baralhos/${id}/carta/${card._id.toString()}`}
              className="group flex flex-col gap-2"
            >
              <div className="relative w-full aspect-[2/3] rounded-md overflow-hidden bg-muted">
                {card.image ? (
                  <Image
                    src={card.image}
                    alt={card.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    Sem imagem
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-center leading-tight group-hover:underline">
                {card.title}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
