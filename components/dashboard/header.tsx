import { logout } from "@/lib/auth/auth-actions";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  userName: string;
  mobileMenuButton: React.ReactNode;
}

export function Header({ title, userName, mobileMenuButton }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 md:px-6">
      <div className="flex items-center gap-3">
        {mobileMenuButton}
        <h1 className="text-sm font-medium text-muted-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{userName}</span>
        <form action={logout}>
          <Button variant="ghost" size="sm" type="submit">
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}
