import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getOrCreateToday, resolveLiveCard } from "@/lib/daily-card/service";

export async function DailyCardWidget() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.DAILY_CARD_READ)) {
    return null;
  }

  const userId = session.user.id as string;
  const dailyCard = await getOrCreateToday(userId);

  if (!dailyCard) {
    return (
      <div className="max-w-xs rounded-md border border-border bg-card px-3 py-2">
        <p className="text-xs font-medium text-foreground">Carta do dia</p>
        <p className="text-xs text-muted-foreground">Em breve.</p>
      </div>
    );
  }

  const live = await resolveLiveCard(dailyCard);
  const name = live?.card.title ?? dailyCard.cardSnapshot.name;
  const imageUrl = live?.card.image ?? dailyCard.cardSnapshot.imageUrl;
  const visited = dailyCard.revealedAt !== null;

  return (
    <Link
      href="/carta-do-dia"
      className="group flex w-[254px] items-start gap-3 rounded-md border border-border bg-card px-3 py-2 transition-colors hover:bg-accent"
    >
      <div className="w-12 shrink-0 overflow-hidden rounded-sm border border-border">
        {visited ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-lg">🎴</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">
          {visited ? "Sua carta de hoje" : "Sua carta do dia te espera"}
        </p>
        {visited && (
          <p className="truncate text-sm font-medium text-foreground group-hover:underline">
            {name}
          </p>
        )}
      </div>
    </Link>
  );
}
