import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { getProfileBySlug } from "@/lib/profiles/service";
import { checkReadingQuota } from "@/lib/readings/quota";
import { Button } from "@/components/ui/button";

export default async function LeiturasPage() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.READINGS_VIEW)) {
    redirect("/");
  }

  const canCreate = hasPermission(session, PERMISSIONS.READINGS_CREATE);

  let quota: { allowed: boolean; used: number; limit: number | null } | null = null;
  if (canCreate) {
    const profile = session.user.profileSlug
      ? await getProfileBySlug(session.user.profileSlug)
      : null;
    const readingsMonthlyLimit = profile?.readingsMonthlyLimit ?? null;
    quota = await checkReadingQuota(session.user.id, readingsMonthlyLimit);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Leituras</h2>
        {canCreate && (
          <div className="flex items-center gap-3">
            {quota && quota.limit !== null && (
              <span className="text-sm text-muted-foreground">
                {quota.limit - quota.used} de {quota.limit} disponíveis este mês
              </span>
            )}
            {quota && !quota.allowed ? (
              <Button disabled>Limite atingido</Button>
            ) : (
              <Link
                href="/leituras/nova"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Nova Leitura
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="text-center text-muted-foreground py-12">
        <p>Histórico de leituras — Em breve</p>
      </div>
    </div>
  );
}
