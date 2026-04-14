"use client";

import { useTransition } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { subscribeToPlanAction, cancelSubscriptionAction } from "@/app/(dashboard)/planos/actions";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
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
    const toastId = toast.loading("Assinando...");
    startTransition(async () => {
      const result = await subscribeToPlanAction(plan._id);
      if (result.success) {
        toast.update(toastId, {
          render: "Assinatura realizada com sucesso!",
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
        router.refresh();
      } else {
        toast.update(toastId, {
          render: result.error,
          type: "error",
          isLoading: false,
          autoClose: 4000,
        });
      }
    });
  };

  const handleCancel = () => {
    if (!confirm("Tem certeza que deseja cancelar sua assinatura? Você voltará para o plano gratuito.")) {
      return;
    }
    const toastId = toast.loading("Cancelando assinatura...");
    startTransition(async () => {
      const result = await cancelSubscriptionAction();
      if (result.success) {
        toast.update(toastId, {
          render: "Assinatura cancelada.",
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
        router.refresh();
      } else {
        toast.update(toastId, {
          render: result.error,
          type: "error",
          isLoading: false,
          autoClose: 4000,
        });
      }
    });
  };

  return (
    <div
      className={`flex flex-col rounded-lg border bg-card p-6 shadow-sm h-full ${
        isCurrent ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
    >
      {/* Header — always at top */}
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">{plan.name}</h3>
        {isCurrent && (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            Atual
          </span>
        )}
      </div>

      {/* Description — grows to fill space */}
      <div className="flex-1 mt-2">
        {plan.description && (
          <RichTextViewer
            content={plan.description}
            className="text-sm text-muted-foreground"
          />
        )}
      </div>

      {/* Price */}
      <div className="mt-4">
        <span className="text-3xl font-bold">{formattedPrice}</span>
        <span className="text-sm text-muted-foreground">
          {INTERVAL_LABELS[plan.interval] ?? ""}
        </span>
      </div>

      {/* Button — always at bottom */}
      <div className="mt-4">
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
