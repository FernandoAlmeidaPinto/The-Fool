"use server";

import { randomUUID } from "crypto";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { createDeck, updateDeck, addCard, updateCard, getDeckById, setAsDailyDeck } from "@/lib/decks/service";
import { uploadFile, validateImage, processCardImage } from "@/lib/storage/s3";
import { parseAspectRatio } from "@/lib/decks/constants";
import { sanitizeHtml } from "@/lib/html/sanitize";
import { revalidatePath } from "next/cache";

async function requireDecksPermission() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_DECKS)) {
    throw new Error("Unauthorized");
  }
}

export async function createDeckAction(formData: FormData): Promise<{ error?: string; redirectTo?: string }> {
  await requireDecksPermission();

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const type = formData.get("type") as string;
  const aspectRatio = formData.get("cardAspectRatio") as string;

  const coverFile = formData.get("coverImage") as File | null;

  if (!name || !type || !aspectRatio) {
    return { error: "Nome, tipo e proporção são obrigatórios" };
  }

  try {
    let coverImage: string | undefined;
    if (coverFile && coverFile.size > 0) {
      const validationError = validateImage(coverFile);
      if (validationError) return { error: validationError };

      const key = `decks/covers/${randomUUID()}.jpg`;
      const rawBuffer = Buffer.from(await coverFile.arrayBuffer());
      const sharp = (await import("sharp")).default;
      const processedBuffer = await sharp(rawBuffer).resize(600, null).jpeg({ quality: 85 }).toBuffer();
      coverImage = await uploadFile(processedBuffer, key, "image/jpeg");
    }

    await createDeck({ name, description: sanitizeHtml(description ?? ""), type, cardAspectRatio: aspectRatio, coverImage });
    return { redirectTo: "/admin/decks" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao criar baralho" };
  }
}

export async function updateDeckAction(formData: FormData): Promise<{ error?: string; redirectTo?: string }> {
  await requireDecksPermission();

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const type = formData.get("type") as string;
  const aspectRatio = formData.get("cardAspectRatio") as string;
  const coverFile = formData.get("coverImage") as File | null;

  if (!id || !name) {
    return { error: "Campos obrigatórios faltando" };
  }

  try {
    const updateData: Parameters<typeof updateDeck>[1] = {
      name, description: sanitizeHtml(description ?? ""), type, cardAspectRatio: aspectRatio,
    };

    if (coverFile && coverFile.size > 0) {
      const validationError = validateImage(coverFile);
      if (validationError) return { error: validationError };

      const key = `decks/covers/${randomUUID()}.jpg`;
      const rawBuffer = Buffer.from(await coverFile.arrayBuffer());
      const sharp = (await import("sharp")).default;
      const processedBuffer = await sharp(rawBuffer).resize(600, null).jpeg({ quality: 85 }).toBuffer();
      updateData.coverImage = await uploadFile(processedBuffer, key, "image/jpeg");
    }

    await updateDeck(id, updateData);
    return { redirectTo: `/admin/decks/${id}/edit` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao atualizar baralho" };
  }
}

export async function addCardAction(formData: FormData): Promise<{ error?: string; redirectTo?: string }> {
  await requireDecksPermission();

  const deckId = formData.get("deckId") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const file = formData.get("image") as File;

  if (!deckId || !title || !file || file.size === 0) {
    return { error: "Título e imagem são obrigatórios" };
  }

  const validationError = validateImage(file);
  if (validationError) {
    return { error: validationError };
  }

  try {
    const deck = await getDeckById(deckId);
    if (!deck) return { error: "Baralho não encontrado" };

    const { width, height } = parseAspectRatio(deck.cardAspectRatio);
    const key = `decks/${deckId}/${randomUUID()}.jpg`;
    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const processedBuffer = await processCardImage(rawBuffer, width, height);
    const imageUrl = await uploadFile(processedBuffer, key, "image/jpeg");

    await addCard(deckId, { title, description: sanitizeHtml(description ?? ""), image: imageUrl });
    return { redirectTo: `/admin/decks/${deckId}/edit` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao adicionar carta" };
  }
}

export async function updateCardAction(formData: FormData): Promise<{ error?: string; redirectTo?: string }> {
  await requireDecksPermission();

  const deckId = formData.get("deckId") as string;
  const cardId = formData.get("cardId") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const file = formData.get("image") as File | null;

  if (!deckId || !cardId || !title) {
    return { error: "Título é obrigatório" };
  }

  try {
    const data: { title: string; description: string; image?: string } = {
      title,
      description: sanitizeHtml(description ?? ""),
    };

    if (file && file.size > 0) {
      const validationError = validateImage(file);
      if (validationError) {
        return { error: validationError };
      }

      const deck = await getDeckById(deckId);
      if (!deck) return { error: "Baralho não encontrado" };

      const { width, height } = parseAspectRatio(deck.cardAspectRatio);
      const key = `decks/${deckId}/${randomUUID()}.jpg`;
      const rawBuffer = Buffer.from(await file.arrayBuffer());
      const processedBuffer = await processCardImage(rawBuffer, width, height);
      data.image = await uploadFile(processedBuffer, key, "image/jpeg");
    }

    await updateCard(deckId, cardId, data);
    return { redirectTo: `/admin/decks/${deckId}/edit` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao atualizar carta" };
  }
}

export async function setAsDailyDeckAction(formData: FormData): Promise<{ error?: string }> {
  await requireDecksPermission();
  const deckId = formData.get("deckId") as string;
  const enabled = formData.get("enabled") === "true";
  if (!deckId) return { error: "Deck id é obrigatório" };

  try {
    await setAsDailyDeck(enabled ? deckId : null);
    revalidatePath(`/admin/decks/${deckId}/edit`);
    revalidatePath("/admin/decks");
    revalidatePath("/");
    revalidatePath("/carta-do-dia");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao alterar carta do dia" };
  }
}
