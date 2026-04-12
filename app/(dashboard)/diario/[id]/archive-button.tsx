"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
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
    startTransition(async () => {
      if (isArchived) {
        await unarchiveDiaryEntryAction(entryId);
        router.push("/diario");
      } else {
        await archiveDiaryEntryAction(entryId);
        router.push("/diario");
      }
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
