"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/users/model";
import { signIn, signOut } from "@/lib/auth/auth";
import { getProfileBySlug } from "@/lib/profiles/service";

export async function register(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "Todos os campos são obrigatórios" };
  }

  if (password.length < 8) {
    return { error: "A senha deve ter pelo menos 8 caracteres" };
  }

  await connectDB();

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return { error: "Este email já está cadastrado" };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const freeTierProfile = await getProfileBySlug("free_tier");
  if (!freeTierProfile) {
    return { error: "Perfil free_tier não encontrado. Execute 'yarn seed' primeiro." };
  }

  await User.create({
    name,
    email,
    password: hashedPassword,
    profileId: freeTierProfile._id,
  });

  // signIn throws a redirect on success (NEXT_REDIRECT).
  // We must let that propagate — do NOT wrap in try/catch.
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/",
  });

  return null;
}

export async function loginWithCredentials(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email e senha são obrigatórios" };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    // Auth.js signIn throws a redirect on success — rethrow it
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof AuthError) {
      return { error: "Email ou senha inválidos" };
    }
    throw error;
  }

  return null;
}

export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/" });
}

export async function logout() {
  await signOut({ redirectTo: "/auth/login" });
}
