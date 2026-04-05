"use server";

import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { createPlan, updatePlan, togglePlanActive } from "@/lib/plans/service";
import { redirect } from "next/navigation";

async function requirePlansPermission() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_PLANS)) {
    throw new Error("Unauthorized");
  }
}

export async function createPlanAction(formData: FormData) {
  await requirePlansPermission();

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const priceStr = formData.get("price") as string;
  const currency = formData.get("currency") as string;
  const interval = formData.get("interval") as string;
  const profileId = formData.get("profileId") as string;

  if (!name || !priceStr || !profileId) {
    throw new Error("Name, price, and profile are required");
  }

  const price = Math.round(parseFloat(priceStr) * 100);

  await createPlan({
    name,
    description: description ?? "",
    price,
    currency: currency || "BRL",
    interval: interval || "monthly",
    profileId,
  });

  redirect("/admin/plans");
}

export async function updatePlanAction(formData: FormData) {
  await requirePlansPermission();

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const priceStr = formData.get("price") as string;
  const currency = formData.get("currency") as string;
  const interval = formData.get("interval") as string;
  const profileId = formData.get("profileId") as string;

  if (!id || !name || !priceStr || !profileId) {
    throw new Error("Required fields missing");
  }

  const price = Math.round(parseFloat(priceStr) * 100);

  await updatePlan(id, {
    name,
    description: description ?? "",
    price,
    currency: currency || "BRL",
    interval: interval || "monthly",
    profileId,
  });

  redirect("/admin/plans");
}

export async function togglePlanActiveAction(formData: FormData) {
  await requirePlansPermission();

  const id = formData.get("id") as string;
  if (!id) throw new Error("Plan ID required");

  await togglePlanActive(id);
  redirect("/admin/plans");
}
