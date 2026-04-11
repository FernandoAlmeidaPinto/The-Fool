import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { listUsers } from "@/lib/users/service";
import { getActiveSubscriptionsByUserIds, getUserIdsByPlanId, getUserIdsWithoutActivePlan } from "@/lib/subscriptions/service";
import { Profile } from "@/lib/profiles/model";
import { Plan } from "@/lib/plans/model";
import { connectDB } from "@/lib/db/mongoose";
import { listProfiles } from "@/lib/profiles/service";
import { listPlans } from "@/lib/plans/service";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PER_PAGE = 20;

interface Props {
  searchParams: Promise<{ page?: string; profileId?: string; planId?: string }>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_USERS)) {
    redirect("/");
  }

  const { page: pageParam, profileId: filterProfileId, planId: filterPlanId } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  // Fetch filter options
  const [allProfiles, allPlans] = await Promise.all([
    listProfiles(),
    listPlans(),
  ]);

  // Build user query filters
  const filters: { profileId?: string; userIds?: string[] } = {};
  if (filterProfileId) {
    filters.profileId = filterProfileId;
  }
  if (filterPlanId) {
    if (filterPlanId === "free") {
      // Users without any active subscription
      filters.userIds = await getUserIdsWithoutActivePlan();
    } else {
      // Users with active subscription for a specific plan
      filters.userIds = await getUserIdsByPlanId(filterPlanId);
    }
  }

  const { items: users, total } = await listUsers(page, PER_PAGE, filters);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  if (page > totalPages && total > 0) {
    redirect("/admin/users");
  }

  // Batch resolve profiles
  await connectDB();
  const profileIds = [...new Set(users.map((u) => u.profileId?.toString()).filter((id): id is string => Boolean(id)))];
  const profiles = profileIds.length > 0
    ? await Profile.find({ _id: { $in: profileIds } }).lean()
    : [];
  const profileMap = new Map(profiles.map((p) => [p._id.toString(), p]));

  // Batch resolve subscriptions
  const userIds = users.map((u) => u._id.toString());
  const subscriptions = await getActiveSubscriptionsByUserIds(userIds);
  const subMap = new Map(subscriptions.map((s) => [s.userId.toString(), s]));

  // Batch resolve plans from subscriptions
  const planIds = [...new Set(subscriptions.map((s) => s.planId.toString()))];
  const plans = planIds.length > 0
    ? await Plan.find({ _id: { $in: planIds } }).lean()
    : [];
  const planMap = new Map(plans.map((p) => [p._id.toString(), p]));

  const formatDate = (date: Date | undefined | null) =>
    date
      ? new Date(date).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "—";

  // Build query string for pagination links (preserve filters)
  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (p > 1) params.set("page", p.toString());
    if (filterProfileId) params.set("profileId", filterProfileId);
    if (filterPlanId) params.set("planId", filterPlanId);
    const qs = params.toString();
    return `/admin/users${qs ? `?${qs}` : ""}`;
  };

  const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">
          Usuários ({total})
        </h2>
      </div>

      {/* Filters */}
      <form className="flex gap-3 mb-6 flex-wrap">
        <div className="w-48">
          <select
            name="profileId"
            defaultValue={filterProfileId ?? ""}
            className={selectClass}
          >
            <option value="">Todos os perfis</option>
            {allProfiles.map((p) => (
              <option key={p._id.toString()} value={p._id.toString()}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-48">
          <select
            name="planId"
            defaultValue={filterPlanId ?? ""}
            className={selectClass}
          >
            <option value="">Todos os planos</option>
            <option value="free">Free Tier</option>
            {allPlans.filter((p) => p.active).map((p) => (
              <option key={p._id.toString()} value={p._id.toString()}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Filtrar
        </button>
        {(filterProfileId || filterPlanId) && (
          <a
            href="/admin/users"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Limpar
          </a>
        )}
      </form>

      {users.length === 0 ? (
        <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Perfil</th>
                <th className="px-4 py-3 text-left font-medium">Plano</th>
                <th className="px-4 py-3 text-left font-medium">Início</th>
                <th className="px-4 py-3 text-left font-medium">Renova</th>
                <th className="px-4 py-3 text-left font-medium">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const profile = user.profileId
                  ? profileMap.get(user.profileId.toString())
                  : null;
                const sub = subMap.get(user._id.toString());
                const plan = sub ? planMap.get(sub.planId.toString()) : null;

                return (
                  <tr
                    key={user._id.toString()}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        {profile?.name ?? "Sem perfil"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {plan ? (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {plan.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Free Tier</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {formatDate(sub?.startsAt)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {formatDate(sub?.renewsAt)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          {page > 1 ? (
            <Link
              href={buildHref(page - 1)}
              className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium opacity-50 pointer-events-none">
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </span>
          )}

          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={buildHref(page + 1)}
              className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Próxima
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium opacity-50 pointer-events-none">
              Próxima
              <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
