import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { listEntries } from "@/lib/diary/service";
import { Button } from "@/components/ui/button";
import type { DiaryEntryType } from "@/lib/diary/model";

const PAGE_SIZE = 20;

const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  "daily-card": { label: "Carta do Dia", className: "bg-amber-100 text-amber-800" },
  reading: { label: "Leitura", className: "bg-violet-100 text-violet-800" },
  free: { label: "Livre", className: "bg-emerald-100 text-emerald-800" },
};

export default async function ArquivadasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (!hasPermission(session, PERMISSIONS.DIARY_READ)) redirect("/");

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const userId = session.user.id as string;
  const { entries, total, pageSize } = await listEntries(userId, {
    page,
    pageSize: PAGE_SIZE,
    archived: true,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/diario"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar ao diário
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">
            Entradas arquivadas
          </h1>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground max-w-sm">
            Nenhuma entrada arquivada.
          </p>
          <Link href="/diario" className="mt-4">
            <Button variant="outline">Voltar ao diário</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const badge = TYPE_BADGES[entry.type as DiaryEntryType] ?? {
              label: entry.type,
              className: "bg-muted text-muted-foreground",
            };
            const dateLabel = new Date(entry.createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            const bodyPreview =
              entry.body.length > 160
                ? entry.body.slice(0, 160).trimEnd() + "…"
                : entry.body;

            return (
              <Link
                key={entry._id.toString()}
                href={`/diario/${entry._id.toString()}`}
                className="group block rounded-lg border border-border bg-card p-4 hover:border-ring transition-colors opacity-80 hover:opacity-100"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{dateLabel}</span>
                  </div>
                </div>
                {entry.title && (
                  <p className="mt-2 font-semibold text-foreground group-hover:underline">
                    {entry.title}
                  </p>
                )}
                <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
                  {bodyPreview}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Link href={`/diario/arquivadas?page=${page - 1}`}>
              <Button variant="outline" size="sm">Anterior</Button>
            </Link>
          )}
          <span className="self-center text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/diario/arquivadas?page=${page + 1}`}>
              <Button variant="outline" size="sm">Próxima</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
