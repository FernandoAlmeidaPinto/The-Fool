"use client";

import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { stripHtml } from "@/lib/html/strip";
import { reviewCombinationAction } from "@/app/(dashboard)/admin/decks/[id]/combinacoes/actions";

interface CombinationData {
  _id: string;
  cardIds: string[];
  cardKey: string;
  answer: string;
  status: "generated" | "reviewed";
  source: "ai" | "manual";
}

interface CardInfo {
  _id: string;
  title: string;
}

export interface CombinationReviewListProps {
  deckId: string;
  combinations: CombinationData[];
  cardMap: Record<string, CardInfo>;
}

export function CombinationReviewList({
  deckId,
  combinations,
  cardMap,
}: CombinationReviewListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editedAnswer, setEditedAnswer] = useState<string>("");
  const [originalAnswer, setOriginalAnswer] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleExpand = (combination: CombinationData) => {
    if (expandedId === combination._id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(combination._id);
    setEditedAnswer(combination.answer);
    setOriginalAnswer(combination.answer);
    setError(null);
  };

  const handleSave = (combinationId: string) => {
    const toastId = toast.loading("Salvando revisão...");
    startTransition(async () => {
      setError(null);
      const wasEdited = editedAnswer !== originalAnswer;
      const result = await reviewCombinationAction({
        combinationId,
        answer: wasEdited ? editedAnswer : undefined,
        deckId,
      });

      if (!result.success) {
        const msg = result.error ?? "Erro ao salvar";
        toast.update(toastId, {
          render: msg,
          type: "error",
          isLoading: false,
          autoClose: 4000,
        });
        setError(msg);
      } else {
        toast.update(toastId, {
          render: "Combinação revisada!",
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
        setExpandedId(null);
      }
    });
  };

  const getCardTitles = (cardIds: string[]) =>
    cardIds
      .map((id) => cardMap[id]?.title ?? "Carta removida")
      .join(" → ");

  if (combinations.length === 0) {
    return (
      <p className="text-muted-foreground">Nenhuma combinação gerada ainda.</p>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {combinations.map((combo) => {
        const isExpanded = expandedId === combo._id;
        const isPendingStatus = combo.status === "generated";

        return (
          <div
            key={combo._id}
            className="rounded-lg border border-border bg-card"
          >
            {/* Collapsed header */}
            <button
              type="button"
              onClick={() => handleExpand(combo)}
              className="flex w-full items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
            >
              <span
                className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  isPendingStatus
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {isPendingStatus ? "Pendente" : "Revisada"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{getCardTitles(combo.cardIds)}</p>
                {!isExpanded && (
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    {stripHtml(combo.answer).slice(0, 80)}
                    {stripHtml(combo.answer).length > 80 ? "..." : ""}
                  </p>
                )}
              </div>
            </button>

            {/* Expanded editor */}
            {isExpanded && (
              <div className="border-t border-border p-3 space-y-3">
                <RichTextEditor
                  key={combo._id}
                  content={combo.answer}
                  onChange={setEditedAnswer}
                  placeholder="Resposta da combinação"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSave(combo._id)}
                    disabled={isPending}
                  >
                    {isPending ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setExpandedId(null)}
                    disabled={isPending}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
