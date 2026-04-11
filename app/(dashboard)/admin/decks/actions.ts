"use server";

import { randomUUID } from "crypto";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { createDeck, updateDeck, addCard, updateCard, getDeckById, setAsDailyDeck } from "@/lib/decks/service";
import { uploadFile, validateImage, processCardImage } from "@/lib/storage/s3";
import { parseAspectRatio } from "@/lib/decks/constants";
import { sanitizeHtml } from "@/lib/html/sanitize";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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
  const aspectRatio = formData.get("cardAspectRatio") as string;

  const coverFile = formData.get("coverImage") as File | null;

  if (!name || !type || !aspectRatio) {
    throw new Error("Nome, tipo e proporção são obrigatórios");
  }

  let coverImage: string | undefined;
  if (coverFile && coverFile.size > 0) {
    const validationError = validateImage(coverFile);
    if (validationError) throw new Error(validationError);

    const key = `decks/covers/${randomUUID()}.jpg`;
    const rawBuffer = Buffer.from(await coverFile.arrayBuffer());
    // Cover image: resize to 600px wide, auto height
    const sharp = (await import("sharp")).default;
    const processedBuffer = await sharp(rawBuffer).resize(600, null).jpeg({ quality: 85 }).toBuffer();
    coverImage = await uploadFile(processedBuffer, key, "image/jpeg");
  }

  await createDeck({ name, description: sanitizeHtml(description ?? ""), type, cardAspectRatio: aspectRatio, coverImage });
  redirect("/admin/decks");
}

export async function updateDeckAction(formData: FormData) {
  await requireDecksPermission();

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const type = formData.get("type") as string;
  const aspectRatio = formData.get("cardAspectRatio") as string;
  const coverFile = formData.get("coverImage") as File | null;

  if (!id || !name) {
    throw new Error("Campos obrigatórios faltando");
  }

  const updateData: Parameters<typeof updateDeck>[1] = {
    name, description: sanitizeHtml(description ?? ""), type, cardAspectRatio: aspectRatio,
  };

  if (coverFile && coverFile.size > 0) {
    const validationError = validateImage(coverFile);
    if (validationError) throw new Error(validationError);

    const key = `decks/covers/${randomUUID()}.jpg`;
    const rawBuffer = Buffer.from(await coverFile.arrayBuffer());
    const sharp = (await import("sharp")).default;
    const processedBuffer = await sharp(rawBuffer).resize(600, null).jpeg({ quality: 85 }).toBuffer();
    updateData.coverImage = await uploadFile(processedBuffer, key, "image/jpeg");
  }

  await updateDeck(id, updateData);
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

  const deck = await getDeckById(deckId);
  if (!deck) throw new Error("Baralho não encontrado");

  const { width, height } = parseAspectRatio(deck.cardAspectRatio);
  const key = `decks/${deckId}/${randomUUID()}.jpg`;
  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const processedBuffer = await processCardImage(rawBuffer, width, height);
  const imageUrl = await uploadFile(processedBuffer, key, "image/jpeg");

  await addCard(deckId, { title, description: sanitizeHtml(description ?? ""), image: imageUrl });
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
    description: sanitizeHtml(description ?? ""),
  };

  if (file && file.size > 0) {
    const validationError = validateImage(file);
    if (validationError) {
      throw new Error(validationError);
    }

    const deck = await getDeckById(deckId);
    if (!deck) throw new Error("Baralho não encontrado");

    const { width, height } = parseAspectRatio(deck.cardAspectRatio);
    const key = `decks/${deckId}/${randomUUID()}.jpg`;
    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const processedBuffer = await processCardImage(rawBuffer, width, height);
    data.image = await uploadFile(processedBuffer, key, "image/jpeg");
  }

  await updateCard(deckId, cardId, data);
  redirect(`/admin/decks/${deckId}/edit`);
}

export async function setAsDailyDeckAction(formData: FormData) {
  await requireDecksPermission();
  const deckId = formData.get("deckId") as string;
  const enabled = formData.get("enabled") === "true";
  if (!deckId) throw new Error("Deck id é obrigatório");
  await setAsDailyDeck(enabled ? deckId : null);
  revalidatePath("/admin/decks/" + deckId + "/edit");
  revalidatePath("/admin/decks");
}
