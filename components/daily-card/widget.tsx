import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getOrCreateToday, resolveLiveCard } from "@/lib/daily-card/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export async function DailyCardWidget() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.DAILY_CARD_READ)) {
    return null;
  }

  const userId = session.user.id as string;
  const dailyCard = await getOrCreateToday(userId);

  if (!dailyCard) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Carta do dia</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Em breve.</p>
        </CardContent>
      </Card>
    );
  }

  const live = await resolveLiveCard(dailyCard);
  const name = live?.card.title ?? dailyCard.cardSnapshot.name;
  const imageUrl = live?.card.image ?? dailyCard.cardSnapshot.imageUrl;
  const visited = dailyCard.revealedAt !== null;

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>{visited ? "Sua carta de hoje" : "Sua carta do dia te espera"}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <div className="h-28 w-20 shrink-0 overflow-hidden rounded-md border border-border">
          {visited ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={name} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-2xl">🎴</div>
          )}
        </div>
        <div className="flex-1">
          {visited && <p className="mb-2 text-sm font-medium text-foreground">{name}</p>}
          <Link href="/carta-do-dia">
            <Button size="sm" variant={visited ? "outline" : "default"}>
              {visited ? "Ver novamente" : "Revelar"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
