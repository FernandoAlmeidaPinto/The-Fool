import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { listDecks } from "@/lib/decks/service";
import { checkReadingQuota } from "@/lib/readings/quota";
import { parseAspectRatio } from "@/lib/decks/constants";
import { NewReadingWizard } from "@/components/readings/new-reading-wizard";
import type { DeckForWizard } from "@/components/readings/new-reading-wizard";

export default async function NovaLeituraPage() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.READINGS_CREATE)) {
    redirect("/");
  }

  const quota = await checkReadingQuota(session.user.id);

  if (!quota.allowed) {
    redirect("/leituras");
  }

  const allDecks = await listDecks();

  // Serialize deck data for client component
  const decks: DeckForWizard[] = allDecks.map((deck) => ({
    _id: deck._id.toString(),
    name: deck.name,
    type: deck.type,
    coverImage: deck.coverImage ?? deck.cards[0]?.image ?? null,
    cardAspectRatio: parseAspectRatio(deck.cardAspectRatio).cssValue,
    cards: [...deck.cards]
      .sort((a, b) => a.order - b.order)
      .map((card) => ({
        _id: card._id.toString(),
        title: card.title,
        image: card.image,
      })),
  }));

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold text-foreground mb-6">Nova Leitura</h2>
      <NewReadingWizard
        decks={decks}
        quotaUsed={quota.used}
        quotaLimit={quota.limit}
      />
    </div>
  );
}
