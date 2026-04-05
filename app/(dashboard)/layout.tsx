import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { SidebarContent } from "@/components/dashboard/sidebar";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { PageTitle } from "@/components/dashboard/page-title";
import { logout } from "@/lib/auth/auth-actions";
import { Button } from "@/components/ui/button";
import { getUserById } from "@/lib/users/service";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = await getUserById(session.user.id);
  const avatarUrl = user?.avatar ?? null;
  const initials = session.user.name
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border md:bg-card overflow-y-auto">
        <SidebarContent session={session} />
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 md:px-6">
          <div className="flex items-center gap-3">
            <MobileSidebar session={session} />
            <PageTitle />
          </div>
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={session.user.name}
                className="h-7 w-7 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground border border-border">
                {initials}
              </div>
            )}
            <span className="text-sm text-muted-foreground">{session.user.name}</span>
            <form action={logout}>
              <Button variant="ghost" size="sm" type="submit">
                Sair
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
