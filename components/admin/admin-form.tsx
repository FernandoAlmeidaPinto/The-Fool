"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

interface AdminFormProps {
  action: (formData: FormData) => Promise<{ error?: string; redirectTo?: string }>;
  loadingMessage: string;
  successMessage: string;
  children: React.ReactNode;
  className?: string;
}

export function AdminForm({
  action,
  loadingMessage,
  successMessage,
  children,
  className,
}: AdminFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    const toastId = toast.loading(loadingMessage);

    startTransition(async () => {
      const result = await action(formData);

      if (result?.error) {
        toast.update(toastId, {
          render: result.error,
          type: "error",
          isLoading: false,
          autoClose: 4000,
        });
      } else {
        toast.update(toastId, {
          render: successMessage,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
        if (result?.redirectTo) {
          router.push(result.redirectTo);
        } else {
          router.refresh();
        }
      }
    });
  };

  return (
    <form action={handleSubmit}>
      <fieldset disabled={isPending} className={className ?? "space-y-4"}>
        {children}
      </fieldset>
    </form>
  );
}
