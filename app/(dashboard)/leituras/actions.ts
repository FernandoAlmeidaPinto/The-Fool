"use server";

import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { checkReadingQuota } from "@/lib/readings/quota";
import { createReading } from "@/lib/readings/service";

export async function createReadingAction(data: {
  deckId: string;
  cardIds: string[];
  context: string;
}): Promise<{ id: string } | { error: string }> {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.READINGS_CREATE)) {
    return { error: "Sem permissão para criar leituras" };
  }

  // Check quota
  const quota = await checkReadingQuota(session.user.id);
  if (!quota.allowed) {
    return { error: "Você atingiu o limite de leituras deste mês" };
  }

  try {
    const interpretation = await createReading({
      userId: session.user.id,
      deckId: data.deckId,
      cardIds: data.cardIds,
      context: data.context,
    });

    return { id: interpretation._id.toString() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao criar leitura" };
  }
}
