import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getHistory, resolveLiveCard } from "@/lib/daily-card/service";
import { Button } from "@/components/ui/button";
import { parseAspectRatio } from "@/lib/decks/constants";

const PAGE_SIZE = 30;

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (!hasPermission(session, PERMISSIONS.DAILY_CARD_READ)) redirect("/");

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const userId = session.user.id as string;
  const { items, total, pageSize } = await getHistory(userId, { page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const resolved = await Promise.all(
    items.map(async (dc) => {
      const live = await resolveLiveCard(dc);
      return {
        dc,
        name: live?.card.title ?? dc.cardSnapshot.name,
        imageUrl: live?.card.image ?? dc.cardSnapshot.imageUrl,
        aspectRatio: parseAspectRatio(live?.deck.cardAspectRatio ?? "2/3").cssValue,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Histórico — Carta do Dia</h1>
        <Link href="/carta-do-dia">
          <Button variant="outline" size="sm">Carta de hoje</Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground">Ainda não há cartas no seu histórico.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {resolved.map(({ dc, name, imageUrl, aspectRatio }) => (
            <Link
              key={dc._id.toString()}
              href={`/carta-do-dia/historico/${dc.date}`}
              className="group flex flex-col gap-2"
            >
              <div className="relative overflow-hidden rounded-md border border-border" style={{ aspectRatio }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt={name} className="h-full w-full object-contain opacity-80 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{dc.date}</p>
                <p className="text-sm font-medium leading-tight group-hover:underline">{name}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Link href={`/carta-do-dia/historico?page=${page - 1}`}>
              <Button variant="outline" size="sm">Anterior</Button>
            </Link>
          )}
          <span className="self-center text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/carta-do-dia/historico?page=${page + 1}`}>
              <Button variant="outline" size="sm">Próxima</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
