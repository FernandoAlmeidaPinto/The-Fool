import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect, notFound } from "next/navigation";
import { getDeckById } from "@/lib/decks/service";
import { listCombinationsByDeck } from "@/lib/readings/service";
import { CombinationReviewList } from "@/components/admin/combination-review-list";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CombinationsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_DECKS)) {
    redirect("/");
  }

  const { id } = await params;
  const deck = await getDeckById(id);
  if (!deck) notFound();

  const combinations = await listCombinationsByDeck(id);

  // Build card ID → title map from deck subdocuments
  const cardMap: Record<string, { _id: string; title: string }> = {};
  for (const card of deck.cards) {
    cardMap[card._id.toString()] = {
      _id: card._id.toString(),
      title: card.title,
    };
  }

  // Serialize for client component
  const serializedCombinations = combinations.map((c) => ({
    _id: c._id.toString(),
    cardIds: c.cardIds.map((cid) => cid.toString()),
    cardKey: c.cardKey,
    answer: c.answer,
    status: c.status,
    source: c.source,
  }));

  const pendingCount = combinations.filter((c) => c.status === "generated").length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/decks/${id}/edit`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar para {deck.name}
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Combinações — {deck.name}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {combinations.length} combinaç{combinations.length === 1 ? "ão" : "ões"}
            {pendingCount > 0 && ` · ${pendingCount} pendente${pendingCount > 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      <CombinationReviewList
        deckId={id}
        combinations={serializedCombinations}
        cardMap={cardMap}
      />
    </div>
  );
}
