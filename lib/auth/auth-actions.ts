"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/users/model";
import { signIn, signOut } from "@/lib/auth/auth";
import { getProfileBySlug } from "@/lib/profiles/service";

export async function register(formData: FormData): Promise<void> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    throw new Error("All fields are required");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  await connectDB();

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("Email already registered");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const freeTierProfile = await getProfileBySlug("free_tier");
  if (!freeTierProfile) {
    throw new Error("Free tier profile not found. Run 'yarn seed' first.");
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
}

export async function loginWithCredentials(formData: FormData): Promise<void> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    throw new Error("Email and password are required");
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
      throw new Error("Invalid email or password");
    }
    throw error;
  }
}

export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/" });
}

export async function logout() {
  await signOut({ redirectTo: "/auth/login" });
}
