import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getHistory, getByDate, resolveLiveCard } from "@/lib/daily-card/service";
import { findEntryFor } from "@/lib/diary/service";
import { listUserInterpretations } from "@/lib/readings/service";
import { getDeckById } from "@/lib/decks/service";
import { EntryForm } from "@/components/diary/entry-form";
import type { DailyCardOption, ReadingOption } from "@/components/diary/entry-form";
import type { DiaryEntryType } from "@/lib/diary/model";

export default async function NovaDiarioPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; ref?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (!hasPermission(session, PERMISSIONS.DIARY_WRITE)) redirect("/diario");

  const { tipo, ref } = await searchParams;
  const userId = session.user.id as string;

  // Resolve preselected type
  let preselectedType: DiaryEntryType | undefined;
  if (tipo === "carta-do-dia") preselectedType = "daily-card";
  else if (tipo === "leitura") preselectedType = "reading";
  else if (tipo === "livre") preselectedType = "free";

  let preselectedDailyCardId: string | undefined;
  let preselectedInterpretationId: string | undefined;

  // Resolve preselected reference for daily-card type
  if (preselectedType === "daily-card" && ref) {
    // ref is a YYYY-MM-DD date — find the DailyCard for that date
    const dc = await getByDate(userId, ref);
    if (dc) {
      preselectedDailyCardId = dc._id.toString();
    }
  }

  // Resolve preselected reference for reading type
  if (preselectedType === "reading" && ref) {
    preselectedInterpretationId = ref;
  }

  // --- Fetch recent daily cards (last 30), filter those already with an entry ---
  const { items: recentDailyCardItems } = await getHistory(userId, { page: 1, pageSize: 30 });

  const dailyCardOptions: DailyCardOption[] = [];
  for (const dc of recentDailyCardItems) {
    const existing = await findEntryFor(userId, { dailyCardId: dc._id.toString() });
    if (existing) continue; // already has a diary entry

    const live = await resolveLiveCard(dc);
    dailyCardOptions.push({
      _id: dc._id.toString(),
      date: new Date(`${dc.date}T12:00:00`).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      cardName: live?.card.title ?? dc.cardSnapshot.name,
      cardImage: live?.card.image ?? dc.cardSnapshot.imageUrl,
    });
  }

  // --- Fetch recent normal-mode readings (last 30), filter those already with an entry ---
  const { items: recentReadingItems } = await listUserInterpretations(userId, 1, 30);
  const normalReadings = recentReadingItems.filter((r) => r.mode === "normal");

  const readingOptions: ReadingOption[] = [];
  for (const reading of normalReadings) {
    const existing = await findEntryFor(userId, {
      interpretationId: reading._id.toString(),
    });
    if (existing) continue; // already has a diary entry

    const deckId = reading.deckId.toString();
    const deck = await getDeckById(deckId);

    readingOptions.push({
      _id: reading._id.toString(),
      context: reading.context,
      createdAt: new Date(reading.createdAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      deckName: deck?.name ?? "Baralho removido",
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/diario"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar ao diário
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">Nova Entrada</h1>
      </div>

      <EntryForm
        preselectedType={preselectedType}
        preselectedDailyCardId={preselectedDailyCardId}
        preselectedInterpretationId={preselectedInterpretationId}
        recentDailyCards={dailyCardOptions}
        recentReadings={readingOptions}
      />
    </div>
  );
}
