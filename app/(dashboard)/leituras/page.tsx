import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { getProfileBySlug } from "@/lib/profiles/service";
import { checkReadingQuota } from "@/lib/readings/quota";
import { listUserInterpretations } from "@/lib/readings/service";
import { getDeckById } from "@/lib/decks/service";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PER_PAGE = 10;

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function LeiturasPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.READINGS_VIEW)) {
    redirect("/");
  }

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const canCreate = hasPermission(session, PERMISSIONS.READINGS_CREATE);

  // Fetch quota and history in parallel
  const profilePromise = canCreate && session.user.profileSlug
    ? getProfileBySlug(session.user.profileSlug)
    : Promise.resolve(null);

  const historyPromise = listUserInterpretations(session.user.id, page, PER_PAGE);

  const [profile, { items: readings, total }] = await Promise.all([
    profilePromise,
    historyPromise,
  ]);

  let quota: { allowed: boolean; used: number; limit: number | null } | null = null;
  if (canCreate) {
    const readingsMonthlyLimit = profile?.readingsMonthlyLimit ?? null;
    quota = await checkReadingQuota(session.user.id, readingsMonthlyLimit);
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  // If page is out of range, redirect to page 1
  if (page > totalPages && total > 0) {
    redirect("/leituras");
  }

  // Resolve deck data for all readings on this page
  const deckIds = [...new Set(readings.map((r) => r.deckId.toString()))];
  const decks = await Promise.all(deckIds.map((id) => getDeckById(id)));
  const deckMap = new Map(
    decks.filter(Boolean).map((d) => [d!._id.toString(), d!])
  );

  // Format date in pt-BR
  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <div>
      {/* Header with quota */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-semibold text-foreground">Leituras</h2>
        {canCreate && (
          <div className="flex items-center gap-3">
            {quota && quota.limit !== null && (
              <span className="text-sm text-muted-foreground">
                {quota.limit - quota.used} de {quota.limit} disponíveis este mês
              </span>
            )}
            {quota && !quota.allowed ? (
              <Button disabled>Limite atingido</Button>
            ) : (
              <Link
                href="/leituras/nova"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Nova Leitura
              </Link>
            )}
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        As leituras aqui são exercícios de aprendizado. O objetivo é ajudar você a desenvolver vocabulário interpretativo e compreender as relações entre as cartas — não substituem uma consulta real.
      </p>

      {/* Reading history */}
      {readings.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <p>Nenhuma leitura realizada ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {readings.map((reading) => {
            const deck = deckMap.get(reading.deckId.toString());
            const cards = reading.cardIds.map((cardId) => {
              const card = deck?.cards.find(
                (c) => c._id.toString() === cardId.toString()
              );
              return card
                ? { _id: card._id.toString(), title: card.title, image: card.image }
                : { _id: cardId.toString(), title: "?", image: "" };
            });

            return (
              <Link
                key={reading._id.toString()}
                href={`/leituras/${reading._id.toString()}`}
                className="flex gap-4 rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/50"
              >
                {/* Card thumbnails */}
                <div className="flex gap-1.5 flex-shrink-0">
                  {cards.map((card, i) => (
                    <div key={card._id} className="relative w-10">
                      <div className="overflow-hidden rounded bg-muted aspect-[2/3]">
                        {card.image ? (
                          <img
                            src={card.image}
                            alt={card.title}
                            className="object-contain w-full h-full"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-[8px] text-muted-foreground">
                            ?
                          </div>
                        )}
                      </div>
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Reading info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {deck?.name ?? "Baralho removido"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(reading.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {reading.context.length > 100
                      ? reading.context.slice(0, 100) + "..."
                      : reading.context}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          {page > 1 ? (
            <Link
              href={`/leituras?page=${page - 1}`}
              className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium opacity-50 pointer-events-none">
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </span>
          )}

          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={`/leituras?page=${page + 1}`}
              className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Próxima
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium opacity-50 pointer-events-none">
              Próxima
              <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
