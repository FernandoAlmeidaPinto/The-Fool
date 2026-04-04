import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { hasAnyPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import Link from "next/link";

const ADMIN_PERMISSIONS = [
  PERMISSIONS.ADMIN_PROFILES,
  PERMISSIONS.ADMIN_PLANS,
  PERMISSIONS.ADMIN_USERS,
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || !hasAnyPermission(session, ADMIN_PERMISSIONS)) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/admin/profiles" className="text-sm font-medium text-foreground hover:text-primary">
            Profiles
          </Link>
          <Link href="/admin/plans" className="text-sm font-medium text-foreground hover:text-primary">
            Plans
          </Link>
          <div className="ml-auto">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to app
            </Link>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
