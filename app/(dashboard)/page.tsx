import { auth } from "@/lib/auth/auth";
import { DailyCardWidget } from "@/components/daily-card/widget";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">
          Bem-vindo, {session?.user?.name}
        </h2>
        <p className="mt-2 text-muted-foreground">
          Esta é a sua dashboard. Novas funcionalidades aparecerão aqui em breve.
        </p>
      </div>
      <DailyCardWidget />
    </div>
  );
}
