import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { listUsers } from "@/lib/users/service";
import { getActiveSubscriptionsByUserIds } from "@/lib/subscriptions/service";
import { Profile } from "@/lib/profiles/model";
import { Plan } from "@/lib/plans/model";
import { connectDB } from "@/lib/db/mongoose";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PER_PAGE = 20;

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_USERS)) {
    redirect("/");
  }

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const { items: users, total } = await listUsers(page, PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  if (page > totalPages && total > 0) {
    redirect("/admin/users");
  }

  // Batch resolve profiles
  await connectDB();
  const profileIds = [...new Set(users.map((u) => u.profileId?.toString()).filter(Boolean))];
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">
          Usuários ({total})
        </h2>
      </div>

      {users.length === 0 ? (
        <p className="text-muted-foreground">Nenhum usuário cadastrado.</p>
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
              href={`/admin/users?page=${page - 1}`}
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
              href={`/admin/users?page=${page + 1}`}
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
