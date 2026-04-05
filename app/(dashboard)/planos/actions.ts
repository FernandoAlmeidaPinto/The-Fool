"use server";

import { auth } from "@/lib/auth/auth";
import { subscribeToPlan, cancelSubscription } from "@/lib/subscriptions/service";
import { revalidatePath } from "next/cache";

export async function subscribeToPlanAction(
  planId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Não autenticado" };
  }

  try {
    await subscribeToPlan(session.user.id, planId);
    revalidatePath("/planos");
    revalidatePath("/perfil");
    revalidatePath("/leituras");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao assinar" };
  }
}

export async function cancelSubscriptionAction(): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Não autenticado" };
  }

  try {
    const cancelled = await cancelSubscription(session.user.id);
    if (!cancelled) {
      return { success: false, error: "Nenhuma assinatura ativa encontrada" };
    }
    revalidatePath("/planos");
    revalidatePath("/perfil");
    revalidatePath("/leituras");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao cancelar" };
  }
}
