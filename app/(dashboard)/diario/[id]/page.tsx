import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getEntryById } from "@/lib/diary/service";
import { getByDate, resolveLiveCard } from "@/lib/daily-card/service";
import { getInterpretationById } from "@/lib/readings/service";
import { getDeckById } from "@/lib/decks/service";
import { parseAspectRatio } from "@/lib/decks/constants";
import { ArchiveButton } from "./archive-button";
import type { DiaryEntryType } from "@/lib/diary/model";

interface Props {
  params: Promise<{ id: string }>;
}

const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  "daily-card": { label: "Carta do Dia", className: "bg-amber-100 text-amber-800" },
  reading: { label: "Leitura", className: "bg-violet-100 text-violet-800" },
  free: { label: "Livre", className: "bg-emerald-100 text-emerald-800" },
};

export default async function DiaryEntryPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (!hasPermission(session, PERMISSIONS.DIARY_READ)) redirect("/");

  const { id } = await params;
  const userId = session.user.id as string;

  const entry = await getEntryById(userId, id);
  if (!entry) notFound();

  const isArchived = entry.archivedAt !== null;
  const canWrite = hasPermission(session, PERMISSIONS.DIARY_WRITE);

  const dateLabel = new Date(entry.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const badge = TYPE_BADGES[entry.type as DiaryEntryType] ?? {
    label: entry.type,
    className: "bg-muted text-muted-foreground",
  };

  // Resolve linked context
  let linkedContext: React.ReactNode = null;

  if (entry.type === "daily-card" && entry.dailyCardId) {
    // Fetch DailyCard by id — getByDate needs a date. Use findById approach via service.
    // The service's getEntryById already verifies ownership. We need to fetch the DailyCard doc.
    // We'll use the daily-card model's getDailyCardById via a direct approach:
    const { connectDB } = await import("@/lib/db/mongoose");
    const { DailyCard } = await import("@/lib/daily-card/model");
    await connectDB();
    const dc = await DailyCard.findById(entry.dailyCardId).lean();

    if (dc) {
      const live = await resolveLiveCard(dc);
      const cardName = live?.card.title ?? dc.cardSnapshot.name;
      const cardImage = live?.card.image ?? dc.cardSnapshot.imageUrl;
      const aspectRatio = parseAspectRatio(live?.deck.cardAspectRatio ?? "2/3").cssValue;

      linkedContext = (
        <Link
          href={`/carta-do-dia/historico/${dc.date}`}
          className="group flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3 hover:border-ring transition-colors"
        >
          <div
            className="flex-shrink-0 overflow-hidden rounded border border-border bg-muted"
            style={{ aspectRatio, width: "48px" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cardImage}
              alt={cardName}
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Carta do Dia</p>
            <p className="font-medium text-sm group-hover:underline">{cardName}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(`${dc.date}T12:00:00`).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </Link>
      );
    }
  } else if (entry.type === "reading" && entry.interpretationId) {
    const interpretation = await getInterpretationById(
      entry.interpretationId.toString()
    );
    if (interpretation) {
      const deck = await getDeckById(interpretation.deckId.toString());
      linkedContext = (
        <Link
          href={`/leituras/${interpretation._id.toString()}`}
          className="group flex flex-col gap-1 rounded-lg border border-border bg-muted/30 p-3 hover:border-ring transition-colors"
        >
          <p className="text-xs text-muted-foreground">Leitura</p>
          <p className="font-medium text-sm group-hover:underline line-clamp-2">
            {interpretation.context}
          </p>
          <p className="text-xs text-muted-foreground">
            {deck?.name ?? "Baralho removido"} &middot;{" "}
            {new Date(interpretation.createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </Link>
      );
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          href={isArchived ? "/diario/arquivadas" : "/diario"}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {isArchived ? "Voltar às arquivadas" : "Voltar ao diário"}
        </Link>
        {canWrite && (
          <ArchiveButton entryId={id} isArchived={isArchived} />
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
          <span className="text-sm text-muted-foreground">{dateLabel}</span>
          {isArchived && (
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Arquivada
            </span>
          )}
        </div>

        {entry.title && (
          <h1 className="text-2xl font-semibold text-foreground">{entry.title}</h1>
        )}

        {linkedContext && <div>{linkedContext}</div>}

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
            {entry.body}
          </p>
        </div>
      </div>
    </div>
  );
}
