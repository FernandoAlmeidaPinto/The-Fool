"use client";

import { useEffect, useRef } from "react";
import { toast } from "react-toastify";

interface LoadingToastProps {
  message?: string;
}

export function LoadingToast({ message = "Carregando..." }: LoadingToastProps) {
  const toastId = useRef<ReturnType<typeof toast.loading> | null>(null);

  useEffect(() => {
    toastId.current = toast.loading(message);

    return () => {
      if (toastId.current !== null) {
        toast.dismiss(toastId.current);
        toastId.current = null;
      }
    };
  }, [message]);

  return null;
}
