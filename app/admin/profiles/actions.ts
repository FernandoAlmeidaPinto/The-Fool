"use server";

import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { createProfile, updateProfile } from "@/lib/profiles/service";
import { redirect } from "next/navigation";

async function requireProfilesPermission() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_PROFILES)) {
    throw new Error("Unauthorized");
  }
}

export async function createProfileAction(formData: FormData) {
  await requireProfilesPermission();

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string;
  const permissions = formData.getAll("permissions") as string[];

  if (!name || !slug) {
    throw new Error("Name and slug are required");
  }

  await createProfile({ name, slug, description: description ?? "", permissions });
  redirect("/admin/profiles");
}

export async function updateProfileAction(formData: FormData) {
  await requireProfilesPermission();

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const permissions = formData.getAll("permissions") as string[];

  if (!id || !name) {
    throw new Error("ID and name are required");
  }

  await updateProfile(id, { name, description: description ?? "", permissions });
  redirect("/admin/profiles");
}
