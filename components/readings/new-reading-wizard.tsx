"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createReadingAction } from "@/app/(dashboard)/leituras/actions";
import { PathChoice } from "./path-choice";
import type { ReadingPath } from "./path-choice";
import { PracticeStep } from "./practice-step";

export interface DeckForWizard {
  _id: string;
  name: string;
  type: string;
  coverImage: string | null;
  cardAspectRatio: string;
  cards: {
    _id: string;
    title: string;
    image: string;
  }[];
}

interface NewReadingWizardProps {
  decks: DeckForWizard[];
  quotaUsed: number;
  quotaLimit: number | null;
}

type WizardStep = "deck" | "cards" | "choice" | "practice" | "normal";

export function NewReadingWizard({
  decks,
  quotaUsed,
  quotaLimit,
}: NewReadingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("choice");
  const [readingPath, setReadingPath] = useState<ReadingPath | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<DeckForWizard | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [context, setContext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSelectDeck = (deck: DeckForWizard) => {
    setSelectedDeck(deck);
    setSelectedCardIds([]);
    setStep("cards");
  };

  const handleToggleCard = (cardId: string) => {
    setSelectedCardIds((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      }
      if (prev.length >= 5) return prev;
      return [...prev, cardId];
    });
  };

  const handleChoose = (path: ReadingPath) => {
    setReadingPath(path);
    setStep("deck");
  };

  const handleSubmitNormal = () => {
    if (!selectedDeck || selectedCardIds.length < 2 || !context.trim()) return;

    startTransition(async () => {
      setError(null);
      const result = await createReadingAction({
        deckId: selectedDeck._id,
        cardIds: selectedCardIds,
        context: context.trim(),
      });

      if ("error" in result) {
        setError(result.error);
      } else {
        router.push(`/leituras/${result.id}`);
      }
    });
  };

  const selectedCardsSummary = selectedDeck && (
    <div>
      <p className="text-sm font-medium mb-2">Cartas selecionadas:</p>
      <div className="flex gap-2 flex-wrap">
        {selectedCardIds.map((cardId, i) => {
          const card = selectedDeck.cards.find((c) => c._id === cardId);
          return card ? (
            <span
              key={cardId}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {i + 1}
              </span>
              {card.title}
            </span>
          ) : null;
        })}
      </div>
    </div>
  );

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step: Choice (first step) */}
      {step === "choice" && (
        <PathChoice onChoose={handleChoose} />
      )}

      {/* Step: Select Deck */}
      {step === "deck" && (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setStep("choice")}>
            ← Voltar
          </Button>
          <p className="text-sm text-muted-foreground">
            Escolha o baralho para sua leitura:
          </p>
          {decks.length === 0 ? (
            <p className="text-muted-foreground">Nenhum baralho disponível.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {decks.map((deck) => (
                <button
                  key={deck._id}
                  type="button"
                  onClick={() => handleSelectDeck(deck)}
                  className="group rounded-lg border border-border bg-card text-left shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative w-full aspect-[3/2] bg-muted flex items-center justify-center">
                    {deck.coverImage ? (
                      <img
                        src={deck.coverImage}
                        alt={deck.name}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Sem imagem
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold group-hover:underline">
                      {deck.name}
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {deck.cards.length}{" "}
                      {deck.cards.length === 1 ? "carta" : "cartas"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step: Select Cards */}
      {step === "cards" && selectedDeck && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Selecione de 2 a 5 cartas de{" "}
                <strong>{selectedDeck.name}</strong>:
              </p>
              <p className="text-sm font-medium mt-1">
                {selectedCardIds.length} de 5 selecionadas
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setStep("deck");
                setSelectedCardIds([]);
              }}
            >
              Trocar baralho
            </Button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {selectedDeck.cards.map((card) => {
              const isSelected = selectedCardIds.includes(card._id);
              const selectionIndex = selectedCardIds.indexOf(card._id);
              return (
                <button
                  key={card._id}
                  type="button"
                  onClick={() => handleToggleCard(card._id)}
                  className={`group relative flex flex-col gap-1.5 rounded-md border-2 p-1 transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:border-muted-foreground/30"
                  }`}
                >
                  <div
                    className="relative overflow-hidden rounded"
                    style={{ aspectRatio: selectedDeck.cardAspectRatio }}
                  >
                    <img
                      src={card.image}
                      alt={card.title}
                      className={`object-contain w-full h-full transition-opacity ${
                        isSelected
                          ? "opacity-100"
                          : "opacity-70 group-hover:opacity-100"
                      }`}
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {selectionIndex + 1}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium text-center leading-tight truncate">
                    {card.title}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => setStep(readingPath === "practice" ? "practice" : "normal")}
              disabled={selectedCardIds.length < 2}
            >
              Continuar
            </Button>
          </div>
        </div>
      )}

      {/* Step: Practice */}
      {step === "practice" && selectedDeck && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border p-4">
            {selectedCardsSummary}
          </div>
          <PracticeStep
            deckId={selectedDeck._id}
            cardIds={selectedCardIds}
            quotaUsed={quotaUsed}
            quotaLimit={quotaLimit}
            onBack={() => setStep("cards")}
          />
        </div>
      )}

      {/* Step: Normal (write question + submit) */}
      {step === "normal" && selectedDeck && (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setStep("cards")}>
            ← Voltar
          </Button>

          <div className="space-y-3 rounded-lg border border-border p-4">
            {selectedCardsSummary}

            <div className="space-y-1.5">
              <Label htmlFor="context">Sua pergunta ou contexto</Label>
              <textarea
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Ex: O que essas cartas significam para minha vida profissional?"
                rows={4}
                required
                disabled={isPending}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              />
            </div>

            {quotaLimit !== null && (
              <p className="text-sm text-muted-foreground">
                Esta será sua {quotaUsed + 1}ª de {quotaLimit} leituras este mês
              </p>
            )}

            <Button
              onClick={handleSubmitNormal}
              disabled={
                isPending || !context.trim() || selectedCardIds.length < 2
              }
              className="w-full"
            >
              {isPending ? "Gerando interpretação..." : "Gerar Leitura"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
