"use server";

import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import {
  createEntry,
  archiveEntry,
  unarchiveEntry,
} from "@/lib/diary/service";
import type { DiaryEntryType } from "@/lib/diary/model";

export async function createDiaryEntryAction(data: {
  type: DiaryEntryType;
  title?: string;
  body: string;
  dailyCardId?: string;
  interpretationId?: string;
}): Promise<{ id: string } | { error: string }> {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.DIARY_WRITE)) {
    return { error: "Sem permissão para escrever no diário" };
  }

  try {
    const entry = await createEntry({
      userId: session.user.id,
      type: data.type,
      title: data.title || null,
      body: data.body,
      dailyCardId: data.dailyCardId || null,
      interpretationId: data.interpretationId || null,
    });

    return { id: entry._id.toString() };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erro ao salvar entrada",
    };
  }
}

export async function archiveDiaryEntryAction(
  entryId: string
): Promise<{ success: boolean } | { error: string }> {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.DIARY_WRITE)) {
    return { error: "Sem permissão" };
  }

  const result = await archiveEntry(session.user.id, entryId);
  if (!result) return { error: "Entrada não encontrada" };
  return { success: true };
}

export async function unarchiveDiaryEntryAction(
  entryId: string
): Promise<{ success: boolean } | { error: string }> {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.DIARY_WRITE)) {
    return { error: "Sem permissão" };
  }

  const result = await unarchiveEntry(session.user.id, entryId);
  if (!result) return { error: "Entrada não encontrada" };
  return { success: true };
}
