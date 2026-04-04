import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { logout } from "@/lib/auth/auth-actions";
import { Button } from "@/components/ui/button";
import { hasAnyPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import Link from "next/link";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <h1 className="text-2xl font-semibold text-foreground">
        Welcome, {session.user.name}
      </h1>
      <p className="mt-2 text-muted-foreground">
        You are signed in as {session.user.email}
      </p>
      <form action={logout} className="mt-4">
        <Button type="submit" variant="outline">
          Sign Out
        </Button>
      </form>
      {hasAnyPermission(session, [
        PERMISSIONS.ADMIN_PROFILES,
        PERMISSIONS.ADMIN_PLANS,
        PERMISSIONS.ADMIN_USERS,
      ]) && (
        <Link href="/admin" className="mt-2 text-sm text-primary underline">
          Admin Panel
        </Link>
      )}
    </div>
  );
}
