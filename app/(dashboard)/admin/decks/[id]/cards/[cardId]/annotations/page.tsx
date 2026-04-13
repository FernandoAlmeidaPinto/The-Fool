import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect, notFound } from "next/navigation";
import { getDeckById, getCardFromDeck } from "@/lib/decks/service";
import Link from "next/link";
import { AnnotationEditor } from "@/components/admin/annotation-editor";
import { getImageUrl } from "@/lib/storage/s3";
import {
  createAnnotationAction,
  updateAnnotationAction,
  deleteAnnotationAction,
} from "./actions";

export default async function AnnotationsPage({
  params,
}: {
  params: Promise<{ id: string; cardId: string }>;
}) {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_DECKS)) {
    redirect("/");
  }

  const { id, cardId } = await params;
  const deck = await getDeckById(id);
  if (!deck) notFound();

  const result = await getCardFromDeck(id, cardId);
  if (!result) notFound();

  const { card } = result;

  // Serialize annotations: ObjectId → string
  const serializedAnnotations = (card.annotations ?? []).map((a) => ({
    _id: a._id.toString(),
    x: a.x,
    y: a.y,
    title: a.title,
    description: a.description,
    order: a.order,
  }));

  return (
    <div className="space-y-4">
      <Link
        href={`/admin/decks/${id}/cards/${cardId}/edit`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Voltar para edição da carta
      </Link>

      <h2 className="text-lg font-semibold">
        Anotações — {card.title}
      </h2>

      <AnnotationEditor
        deckId={id}
        cardId={cardId}
        cardImage={getImageUrl(card.image)!}
        cardAspectRatio={deck.cardAspectRatio}
        initialAnnotations={serializedAnnotations}
        createAction={createAnnotationAction}
        updateAction={updateAnnotationAction}
        deleteAction={deleteAnnotationAction}
      />
    </div>
  );
}
