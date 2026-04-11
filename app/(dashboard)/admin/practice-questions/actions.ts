"use server";

import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import {
  createPracticeQuestion,
  updatePracticeQuestion,
  deletePracticeQuestion,
} from "@/lib/readings/practice-question-service";
import { redirect } from "next/navigation";

async function requirePermission() {
  const session = await auth();
  if (
    !session?.user ||
    !hasPermission(session, PERMISSIONS.ADMIN_PRACTICE_QUESTIONS)
  ) {
    throw new Error("Unauthorized");
  }
}

export async function createPracticeQuestionAction(formData: FormData) {
  await requirePermission();

  const text = (formData.get("text") as string | null)?.trim() ?? "";
  const deckIdRaw = (formData.get("deckId") as string | null)?.trim() ?? "";
  const active = formData.get("active") === "on";

  await createPracticeQuestion({
    text,
    deckId: deckIdRaw === "" || deckIdRaw === "global" ? null : deckIdRaw,
    active,
  });

  redirect("/admin/practice-questions");
}

export async function updatePracticeQuestionAction(formData: FormData) {
  await requirePermission();

  const id = formData.get("id") as string;
  if (!id) throw new Error("ID é obrigatório");

  const text = (formData.get("text") as string | null)?.trim() ?? "";
  const deckIdRaw = (formData.get("deckId") as string | null)?.trim() ?? "";
  const active = formData.get("active") === "on";

  await updatePracticeQuestion(id, {
    text,
    deckId: deckIdRaw === "" || deckIdRaw === "global" ? null : deckIdRaw,
    active,
  });

  redirect("/admin/practice-questions");
}

export async function deletePracticeQuestionAction(formData: FormData) {
  await requirePermission();

  const id = formData.get("id") as string;
  if (!id) throw new Error("ID é obrigatório");

  await deletePracticeQuestion(id);

  redirect("/admin/practice-questions");
}
