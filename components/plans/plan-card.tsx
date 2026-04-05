"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { subscribeToPlanAction, cancelSubscriptionAction } from "@/app/(dashboard)/planos/actions";
import { useRouter } from "next/navigation";

interface PlanCardProps {
  plan: {
    _id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    interval: string;
  };
  isCurrent: boolean;
  hasSubscription: boolean;
}

const INTERVAL_LABELS: Record<string, string> = {
  monthly: "/mês",
  yearly: "/ano",
  one_time: " (único)",
};

export function PlanCard({ plan, isCurrent, hasSubscription }: PlanCardProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const formattedPrice = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: plan.currency,
  }).format(plan.price / 100);

  const handleSubscribe = () => {
    startTransition(async () => {
      const result = await subscribeToPlanAction(plan._id);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  const handleCancel = () => {
    if (!confirm("Tem certeza que deseja cancelar sua assinatura? Você voltará para o plano gratuito.")) {
      return;
    }
    startTransition(async () => {
      const result = await cancelSubscriptionAction();
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  return (
    <div
      className={`rounded-lg border bg-card p-6 shadow-sm ${
        isCurrent
          ? "border-primary ring-2 ring-primary/20"
          : "border-border"
      }`}
    >
      <div className="space-y-4">
        <div>
          {isCurrent && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary mb-2">
              Plano Atual
            </span>
          )}
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          {plan.description && (
            <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
          )}
        </div>

        <div>
          <span className="text-3xl font-bold">{formattedPrice}</span>
          <span className="text-sm text-muted-foreground">
            {INTERVAL_LABELS[plan.interval] ?? ""}
          </span>
        </div>

        {isCurrent ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleCancel}
            disabled={isPending}
          >
            {isPending ? "Cancelando..." : "Cancelar Assinatura"}
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={handleSubscribe}
            disabled={isPending}
          >
            {isPending ? "Assinando..." : "Assinar"}
          </Button>
        )}
      </div>
    </div>
  );
}
