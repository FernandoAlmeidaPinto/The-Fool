"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  archiveDiaryEntryAction,
  unarchiveDiaryEntryAction,
} from "@/app/(dashboard)/diario/actions";

interface ArchiveButtonProps {
  entryId: string;
  isArchived: boolean;
}

export function ArchiveButton({ entryId, isArchived }: ArchiveButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const label = isArchived ? "Restaurando..." : "Arquivando...";
    const toastId = toast.loading(label);

    startTransition(async () => {
      const action = isArchived
        ? unarchiveDiaryEntryAction
        : archiveDiaryEntryAction;
      const result = await action(entryId);

      if ("error" in result) {
        toast.update(toastId, {
          render: result.error,
          type: "error",
          isLoading: false,
          autoClose: 4000,
        });
        return;
      }

      toast.update(toastId, {
        render: isArchived ? "Entrada restaurada!" : "Entrada arquivada!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      router.push(isArchived ? "/diario/arquivadas" : "/diario");
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className="gap-2"
    >
      {isArchived ? (
        <>
          <ArchiveRestore className="h-4 w-4" />
          {isPending ? "Restaurando..." : "Restaurar"}
        </>
      ) : (
        <>
          <Archive className="h-4 w-4" />
          {isPending ? "Arquivando..." : "Arquivar"}
        </>
      )}
    </Button>
  );
}
