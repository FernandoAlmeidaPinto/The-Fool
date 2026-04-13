import Link from "next/link";
import { listDecks } from "@/lib/decks/service";
import { DECK_TYPE_LABELS, DeckType } from "@/lib/decks/constants";
import { Badge } from "@/components/ui/badge";
import { getImageUrl } from "@/lib/storage/s3";

export default async function BaralhosPage() {
  const decks = await listDecks();

  return (
    <div>
      <h2 className="text-2xl font-semibold text-foreground mb-6">Baralhos</h2>

      {decks.length === 0 ? (
        <p className="text-muted-foreground">Nenhum baralho disponível ainda.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck) => {
            const coverSrc = getImageUrl(deck.coverImage ?? deck.cards[0]?.image);

            return (
              <Link
                key={deck._id.toString()}
                href={`/baralhos/${deck._id.toString()}`}
                className="group rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="relative w-full aspect-[3/2] bg-muted flex items-center justify-center">
                  {coverSrc ? (
                    <img
                      src={coverSrc}
                      alt={deck.name}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">Sem imagem</span>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-lg leading-tight group-hover:underline">
                    {deck.name}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">
                      {DECK_TYPE_LABELS[deck.type as DeckType] ?? deck.type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {deck.cards.length} {deck.cards.length === 1 ? "carta" : "cartas"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
