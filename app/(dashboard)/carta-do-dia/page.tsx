import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import {
  getOrCreateToday,
  markRevealed,
  resolveLiveCard,
} from "@/lib/daily-card/service";
import { DailyCardView } from "@/components/daily-card/card-view";
import { Button } from "@/components/ui/button";

export default async function CartaDoDiaPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (!hasPermission(session, PERMISSIONS.DAILY_CARD_READ)) redirect("/");

  const userId = session.user.id as string;
  const dailyCard = await getOrCreateToday(userId);

  if (!dailyCard) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-semibold text-foreground">Carta do Dia</h1>
        <p className="mt-4 text-muted-foreground">
          Nenhum baralho do dia configurado. Volte em breve.
        </p>
        <Link href="/" className="mt-6 inline-block">
          <Button variant="outline">Voltar à dashboard</Button>
        </Link>
      </div>
    );
  }

  if (!dailyCard.revealedAt) {
    await markRevealed(userId, dailyCard.date);
  }

  const live = await resolveLiveCard(dailyCard);
  const name = live?.card.title ?? dailyCard.cardSnapshot.name;
  const imageUrl = live?.card.image ?? dailyCard.cardSnapshot.imageUrl;
  const reflection = live?.card.dailyReflection ?? null;
  const aspectRatio = live?.deck.cardAspectRatio ?? "2/3";

  return (
    <div className="space-y-8">
      <DailyCardView
        name={name}
        imageUrl={imageUrl}
        reflection={reflection}
        aspectRatio={aspectRatio}
      />
      <div className="text-center">
        <Link
          href="/carta-do-dia/historico"
          className="text-sm text-primary hover:underline"
        >
          Ver histórico
        </Link>
      </div>
    </div>
  );
}
