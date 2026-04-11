"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shuffle } from "lucide-react";
import {
  drawPracticeQuestionAction,
  createPracticeAttemptAction,
} from "@/app/(dashboard)/leituras/actions";
import { useRouter } from "next/navigation";

interface PracticeStepProps {
  deckId: string;
  cardIds: string[];
  quotaUsed: number;
  quotaLimit: number | null;
  onBack: () => void;
}

export function PracticeStep({
  deckId,
  cardIds,
  quotaUsed,
  quotaLimit,
  onBack,
}: PracticeStepProps) {
  const router = useRouter();
  const [questionText, setQuestionText] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [lastDrawnId, setLastDrawnId] = useState<string | null>(null);
  const [lastDrawnText, setLastDrawnText] = useState<string | null>(null);
  const [hasAnyEligible, setHasAnyEligible] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDrawing, startDrawTransition] = useTransition();
  const [isSubmitting, startSubmitTransition] = useTransition();

  const didInitialDraw = useRef(false);

  // Draw an initial suggestion on mount
  useEffect(() => {
    if (didInitialDraw.current) return;
    didInitialDraw.current = true;

    (async () => {
      const result = await drawPracticeQuestionAction({ deckId });
      if (result.text) {
        setQuestionText((prev) => (prev.length > 0 ? prev : result.text));
        setLastDrawnId(result.id);
        setLastDrawnText(result.text);
        setHasAnyEligible(true);
      } else {
        setHasAnyEligible(false);
      }
    })();
  }, [deckId]);

  const performDraw = () => {
    startDrawTransition(async () => {
      const result = await drawPracticeQuestionAction({
        deckId,
        excludeId: lastDrawnId ?? undefined,
      });
      if (result.text) {
        setQuestionText(result.text);
        setLastDrawnId(result.id);
        setLastDrawnText(result.text);
        setHasAnyEligible(true);
      }
    });
  };

  const handleDrawClick = () => {
    const userEdited =
      lastDrawnText === null || questionText !== lastDrawnText;
    if (userEdited && questionText.trim().length > 0) {
      setConfirmOpen(true);
      return;
    }
    performDraw();
  };

  const handleConfirmDraw = () => {
    setConfirmOpen(false);
    performDraw();
  };

  const handleSubmit = () => {
    if (!questionText.trim() || !userAnswer.trim()) return;

    startSubmitTransition(async () => {
      setError(null);
      const result = await createPracticeAttemptAction({
        deckId,
        cardIds,
        questionText: questionText.trim(),
        userAnswer: userAnswer.trim(),
      });

      if ("error" in result) {
        setError(result.error);
      } else {
        router.push(`/leituras/${result.id}`);
      }
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button variant="ghost" onClick={onBack}>
        ← Voltar
      </Button>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="question-text">Pergunta de treino</Label>
            {hasAnyEligible && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDrawClick}
                disabled={isDrawing || isSubmitting}
                className="gap-1.5"
              >
                <Shuffle className="h-3.5 w-3.5" />
                Sortear outra
              </Button>
            )}
          </div>
          <textarea
            id="question-text"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            rows={3}
            placeholder="Escreva uma pergunta para treinar sua interpretação"
            disabled={isSubmitting || isDrawing}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="user-answer">Sua resposta</Label>
          <textarea
            id="user-answer"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            rows={8}
            placeholder="Escreva como você acredita que as cartas responderiam essa pergunta..."
            disabled={isSubmitting}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          />
        </div>

        {quotaLimit !== null && (
          <p className="text-sm text-muted-foreground">
            Esta será sua {quotaUsed + 1}ª de {quotaLimit} leituras este mês
          </p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={
            isSubmitting || isDrawing || !questionText.trim() || !userAnswer.trim()
          }
          className="w-full"
        >
          {isSubmitting ? "Enviando resposta..." : "Enviar resposta"}
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sortear outra pergunta?</AlertDialogTitle>
            <AlertDialogDescription>
              Você perderá o texto que digitou.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDraw}>
              Sortear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
