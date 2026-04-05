"use server";

import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { addAnnotation, updateAnnotation, deleteAnnotation } from "@/lib/decks/service";
import { revalidatePath } from "next/cache";

async function requireDecksPermission() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_DECKS)) {
    throw new Error("Unauthorized");
  }
}

export async function createAnnotationAction(data: {
  deckId: string;
  cardId: string;
  x: number;
  y: number;
  title: string;
  description: string;
}) {
  await requireDecksPermission();
  const annotation = await addAnnotation(data.deckId, data.cardId, {
    x: data.x, y: data.y, title: data.title, description: data.description,
  });
  revalidatePath(`/admin/decks/${data.deckId}/cards/${data.cardId}/annotations`);
  revalidatePath(`/baralhos/${data.deckId}/carta/${data.cardId}`);
  return annotation;
}

export async function updateAnnotationAction(data: {
  deckId: string;
  cardId: string;
  annotationId: string;
  x?: number;
  y?: number;
  title?: string;
  description?: string;
}) {
  await requireDecksPermission();
  const annotation = await updateAnnotation(data.deckId, data.cardId, data.annotationId, {
    x: data.x, y: data.y, title: data.title, description: data.description,
  });
  revalidatePath(`/admin/decks/${data.deckId}/cards/${data.cardId}/annotations`);
  revalidatePath(`/baralhos/${data.deckId}/carta/${data.cardId}`);
  return annotation;
}

export async function deleteAnnotationAction(data: {
  deckId: string;
  cardId: string;
  annotationId: string;
}) {
  await requireDecksPermission();
  await deleteAnnotation(data.deckId, data.cardId, data.annotationId);
  revalidatePath(`/admin/decks/${data.deckId}/cards/${data.cardId}/annotations`);
  revalidatePath(`/baralhos/${data.deckId}/carta/${data.cardId}`);
}
