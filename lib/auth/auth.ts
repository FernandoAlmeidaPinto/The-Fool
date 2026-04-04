import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/users/model";

// Auth.js v5 Credentials provider does not trigger adapter session creation,
// so we must use JWT strategy. The adapter still handles user/account storage
// for OAuth providers (Google).

const clientPromise = connectDB().then(() =>
  mongoose.connection.getClient()
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: "the_fool",
  }),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await connectDB();

        const email = credentials.email as string;
        const password = credentials.password as string;

        if (!email || !password) return null;

        const user = await User.findOne({ email }).select("+password");
        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user || trigger === "update") {
        await connectDB();
        const dbUser = await User.findById(token.id ?? user?.id);
        if (dbUser?.profileId) {
          const { Profile } = await import("@/lib/profiles/model");
          const profile = await Profile.findById(dbUser.profileId);
          if (profile) {
            token.profileSlug = profile.slug;
            token.permissions = [...profile.permissions];
          }
        } else {
          token.profileSlug = null;
          token.permissions = [];
        }
        if (user) {
          token.id = user.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.profileSlug = token.profileSlug as string | null;
        session.user.permissions = (token.permissions as string[]) ?? [];
      }
      return session;
    },
  },
});
