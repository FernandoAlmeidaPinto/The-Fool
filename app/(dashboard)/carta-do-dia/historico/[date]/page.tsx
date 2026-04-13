import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getByDate, resolveLiveCard } from "@/lib/daily-card/service";
import { splitReflection } from "@/lib/daily-card/reflection";
import { EditorialLayout } from "@/components/daily-card/editorial-layout";
import { parseAspectRatio } from "@/lib/decks/constants";
import { getImageUrl } from "@/lib/storage/s3";

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
  const imageUrl = getImageUrl(live?.card.image ?? dailyCard.cardSnapshot.imageUrl)!;
  const reflectionHtml = live ? live.card.dailyReflection : null;
  const aspectRatio = parseAspectRatio(live?.deck.cardAspectRatio ?? "2/3").cssValue;

  // Multi-line editorial date. T12:00:00 avoids midnight-UTC off-by-one.
  const dateObj = new Date(`${date}T12:00:00`);
  const dateWeekday = dateObj.toLocaleDateString("pt-BR", { weekday: "long" });
  const dateDayMonth = dateObj
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
    .toUpperCase();
  const dateYear = `DE ${dateObj.getFullYear()}`;

  const { pullQuote, firstLetter, bodyWithoutFirstLetter } =
    splitReflection(reflectionHtml);

  return (
    <EditorialLayout
      name={name}
      imageUrl={imageUrl}
      aspectRatio={aspectRatio}
      dateWeekday={dateWeekday}
      dateDayMonth={dateDayMonth}
      dateYear={dateYear}
      pullQuote={pullQuote}
      firstLetter={firstLetter}
      bodyWithoutFirstLetter={bodyWithoutFirstLetter}
    />
  );
}
