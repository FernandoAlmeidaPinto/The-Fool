"use client";

import { useState, useTransition } from "react";
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
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const action = isArchived
        ? unarchiveDiaryEntryAction
        : archiveDiaryEntryAction;
      const result = await action(entryId);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      router.push(isArchived ? "/diario/arquivadas" : "/diario");
    });
  };

  return (
    <div className="flex items-center gap-3">
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
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
