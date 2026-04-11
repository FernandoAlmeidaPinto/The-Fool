import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { listPlans } from "@/lib/plans/service";
import { getActiveSubscription } from "@/lib/subscriptions/service";
import { PlanCard } from "@/components/plans/plan-card";

export default async function PlanosPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const [plans, subscription] = await Promise.all([
    listPlans(),
    getActiveSubscription(session.user.id),
  ]);

  // Only show active plans
  const activePlans = plans.filter((p) => p.active);

  // Format renewal date
  const renewsAt = subscription
    ? new Date(subscription.renewsAt).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold text-foreground mb-2">Planos</h2>

      {/* Current plan status */}
      <div className="mb-8">
        {subscription ? (
          <p className="text-sm text-muted-foreground">
            Sua assinatura renova em <strong>{renewsAt}</strong>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Você está no plano gratuito
          </p>
        )}
      </div>

      {/* Plan cards */}
      {activePlans.length === 0 ? (
        <p className="text-muted-foreground">Nenhum plano disponível no momento.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activePlans.map((plan) => (
            <PlanCard
              key={plan._id.toString()}
              plan={{
                _id: plan._id.toString(),
                name: plan.name,
                description: plan.description,
                price: plan.price,
                currency: plan.currency,
                interval: plan.interval,
              }}
              isCurrent={
                subscription?.planId.toString() === plan._id.toString()
              }
              hasSubscription={!!subscription}
            />
          ))}
        </div>
      )}
    </div>
  );
}
