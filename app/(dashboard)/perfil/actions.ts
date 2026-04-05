"use server";

import { auth } from "@/lib/auth/auth";
import { updateUser } from "@/lib/users/service";
import { uploadFile, validateImage } from "@/lib/storage/s3";
import { revalidatePath } from "next/cache";

export async function updateProfileAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Não autenticado" };
  }

  const name = formData.get("name") as string;
  if (!name?.trim()) {
    return { success: false, error: "Nome é obrigatório" };
  }

  const birthDateStr = formData.get("birthDate") as string;
  const birthDate = birthDateStr ? new Date(birthDateStr) : null;

  const data: { name: string; birthDate: Date | null; avatar?: string } = {
    name: name.trim(),
    birthDate,
  };

  // Handle avatar upload
  const avatarFile = formData.get("avatar") as File | null;
  if (avatarFile && avatarFile.size > 0) {
    const validationError = validateImage(avatarFile);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const sharp = (await import("sharp")).default;
    const rawBuffer = Buffer.from(await avatarFile.arrayBuffer());
    const processedBuffer = await sharp(rawBuffer)
      .resize(256, 256, { fit: "cover", position: "centre" })
      .jpeg({ quality: 85 })
      .toBuffer();

    const key = `users/avatars/${session.user.id}.jpg`;
    const url = await uploadFile(processedBuffer, key, "image/jpeg");
    // Append timestamp to bust browser cache (same key is reused)
    data.avatar = `${url}?t=${Date.now()}`;
  }

  try {
    await updateUser(session.user.id, data);
    revalidatePath("/perfil");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}
