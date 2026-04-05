import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/users/service";
import { getProfileBySlug } from "@/lib/profiles/service";
import { checkReadingQuota } from "@/lib/readings/quota";
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

  // Fetch profile for plan info
  const profile = session.user.profileSlug
    ? await getProfileBySlug(session.user.profileSlug)
    : null;

  // Fetch reading quota
  const readingsMonthlyLimit = profile?.readingsMonthlyLimit ?? null;
  const readingQuota = await checkReadingQuota(session.user.id, readingsMonthlyLimit);

  // Build plan info
  const planName = profile?.name ?? "Sem plano";
  const limits = [
    {
      label: "Leituras este mês",
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
