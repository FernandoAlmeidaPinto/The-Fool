import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/users/service";
import { checkReadingQuota } from "@/lib/readings/quota";
import { getActiveSubscription } from "@/lib/subscriptions/service";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = await getUserById(session.user.id);
  if (!user) {
    redirect("/auth/login");
  }

  const readingQuota = await checkReadingQuota(session.user.id);
  const subscription = await getActiveSubscription(session.user.id);

  // Get plan name
  let planName = "Free Tier";
  if (subscription) {
    const { getPlanById } = await import("@/lib/plans/service");
    const plan = await getPlanById(subscription.planId.toString());
    planName = plan?.name ?? "Plano";
  }
  const limits = [
    {
      label: "Leituras" + (readingQuota.cycleEnd
        ? ` (renova em ${new Date(readingQuota.cycleEnd).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })})`
        : " este mês"),
      used: readingQuota.used,
      limit: readingQuota.limit,
    },
  ];

  // Serialize for client component
  const birthDateStr = user.birthDate
    ? new Date(user.birthDate).toISOString().split("T")[0]
    : null;

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-semibold text-foreground mb-6">Meu Perfil</h2>
      <ProfileForm
        user={{
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar ?? null,
          birthDate: birthDateStr,
        }}
        plan={{
          name: planName,
          limits,
        }}
      />
    </div>
  );
}
