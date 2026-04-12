import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getByDate, resolveLiveCard } from "@/lib/daily-card/service";
import { DailyCardView } from "@/components/daily-card/card-view";

export default async function HistoricoDetailPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (!hasPermission(session, PERMISSIONS.DAILY_CARD_READ)) redirect("/");

  const { date } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const userId = session.user.id as string;
  const dailyCard = await getByDate(userId, date);
  if (!dailyCard) notFound();

  const live = await resolveLiveCard(dailyCard);
  const name = live?.card.title ?? dailyCard.cardSnapshot.name;
  const imageUrl = live?.card.image ?? dailyCard.cardSnapshot.imageUrl;
  const reflection = live ? live.card.dailyReflection : null;
  const aspectRatio = live?.deck.cardAspectRatio ?? "2/3";

  // Parse the YYYY-MM-DD as a São Paulo date and format it in pt-BR.
  // Appending T12:00:00 avoids any timezone-shift surprises for dateLabel.
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-8">
      <DailyCardView
        name={name}
        imageUrl={imageUrl}
        reflection={reflection}
        aspectRatio={aspectRatio}
        dateLabel={dateLabel}
        size="compact"
      />
      <div className="text-center">
        <Link href="/carta-do-dia/historico" className="text-sm text-primary hover:underline">
          ← Voltar ao histórico
        </Link>
      </div>
    </div>
  );
}
