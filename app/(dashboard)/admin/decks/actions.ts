"use server";

import { randomUUID } from "crypto";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { createDeck, updateDeck, addCard, updateCard } from "@/lib/decks/service";
import { uploadFile, validateImage } from "@/lib/storage/s3";
import { redirect } from "next/navigation";

async function requireDecksPermission() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_DECKS)) {
    throw new Error("Unauthorized");
  }
}

export async function createDeckAction(formData: FormData) {
  await requireDecksPermission();

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const type = formData.get("type") as string;

  if (!name || !type) {
    throw new Error("Name and type are required");
  }

  await createDeck({ name, description: description ?? "", type });
  redirect("/admin/decks");
}

export async function updateDeckAction(formData: FormData) {
  await requireDecksPermission();

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const type = formData.get("type") as string;

  if (!id || !name) {
    throw new Error("ID and name are required");
  }

  await updateDeck(id, { name, description: description ?? "", type });
  redirect(`/admin/decks/${id}/edit`);
}

export async function addCardAction(formData: FormData) {
  await requireDecksPermission();

  const deckId = formData.get("deckId") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const file = formData.get("image") as File;

  if (!deckId || !title || !file || file.size === 0) {
    throw new Error("Deck ID, title, and image are required");
  }

  const validationError = validateImage(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const key = `decks/${deckId}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const imageUrl = await uploadFile(buffer, key, file.type);

  await addCard(deckId, { title, description: description ?? "", image: imageUrl });
  redirect(`/admin/decks/${deckId}/edit`);
}

export async function updateCardAction(formData: FormData) {
  await requireDecksPermission();

  const deckId = formData.get("deckId") as string;
  const cardId = formData.get("cardId") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const file = formData.get("image") as File | null;

  if (!deckId || !cardId || !title) {
    throw new Error("Deck ID, card ID, and title are required");
  }

  const data: { title: string; description: string; image?: string } = {
    title,
    description: description ?? "",
  };

  if (file && file.size > 0) {
    const validationError = validateImage(file);
    if (validationError) {
      throw new Error(validationError);
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const key = `decks/${deckId}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    data.image = await uploadFile(buffer, key, file.type);
  }

  await updateCard(deckId, cardId, data);
  redirect(`/admin/decks/${deckId}/edit`);
}
