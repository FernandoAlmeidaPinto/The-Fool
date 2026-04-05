"use server";

import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { reviewCombination } from "@/lib/readings/service";
import { revalidatePath } from "next/cache";

async function requireDecksPermission() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_DECKS)) {
    throw new Error("Unauthorized");
  }
}

export async function reviewCombinationAction(data: {
  combinationId: string;
  answer?: string;
  deckId: string;
}): Promise<{ success: boolean; error?: string }> {
  await requireDecksPermission();

  try {
    const result = await reviewCombination(data.combinationId, data.answer);
    if (!result) {
      return { success: false, error: "Combinação não encontrada" };
    }

    revalidatePath(`/admin/decks/${data.deckId}/combinacoes`);
    revalidatePath(`/admin/decks/${data.deckId}/edit`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}
