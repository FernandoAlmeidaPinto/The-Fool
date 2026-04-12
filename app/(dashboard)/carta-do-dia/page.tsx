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
import { splitReflection } from "@/lib/daily-card/reflection";
import { findEntryFor } from "@/lib/diary/service";
import { EditorialLayout } from "@/components/daily-card/editorial-layout";
import { parseAspectRatio } from "@/lib/decks/constants";
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
  const reflectionHtml = live?.card.dailyReflection ?? null;
  const aspectRatio = parseAspectRatio(live?.deck.cardAspectRatio ?? "2/3").cssValue;

  // Multi-line editorial date. The T12:00:00 suffix avoids the midnight-UTC
  // off-by-one that happens when a YYYY-MM-DD string is parsed at UTC.
  const dateObj = new Date(`${dailyCard.date}T12:00:00`);
  const dateWeekday = dateObj.toLocaleDateString("pt-BR", { weekday: "long" });
  const dateDayMonth = dateObj
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
    .toUpperCase();
  const dateYear = `DE ${dateObj.getFullYear()}`;

  const { pullQuote, firstLetter, bodyWithoutFirstLetter } =
    splitReflection(reflectionHtml);

  // Diary CTA — only if user has diary:write permission
  let diaryCta: { href: string; label: string } | null = null;
  if (hasPermission(session, PERMISSIONS.DIARY_WRITE)) {
    const existingEntry = await findEntryFor(userId, {
      dailyCardId: dailyCard._id.toString(),
    });
    if (existingEntry) {
      diaryCta = {
        href: `/diario/${existingEntry._id.toString()}`,
        label: "Ver minha reflexão",
      };
    } else {
      diaryCta = {
        href: `/diario/nova?tipo=carta-do-dia&ref=${dailyCard.date}`,
        label: "Escrever no diário",
      };
    }
  }

  return (
    <>
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
      {diaryCta && (
        <div className="mx-auto mt-6 max-w-2xl text-center">
          <Link
            href={diaryCta.href}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
          >
            {diaryCta.label}
          </Link>
        </div>
      )}
    </>
  );
}
