"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Sun, Sparkles, Feather } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createDiaryEntryAction } from "@/app/(dashboard)/diario/actions";

type EntryType = "daily-card" | "reading" | "free";

export interface DailyCardOption {
  _id: string;
  date: string;
  cardName: string;
  cardImage: string;
}

export interface ReadingOption {
  _id: string;
  context: string;
  createdAt: string;
  deckName: string;
}

export interface EntryFormProps {
  preselectedType?: EntryType;
  preselectedDailyCardId?: string;
  preselectedInterpretationId?: string;
  recentDailyCards: DailyCardOption[];
  recentReadings: ReadingOption[];
}

const TYPE_META: Record<
  EntryType,
  { label: string; description: string; icon: React.ReactNode; placeholder: string }
> = {
  "daily-card": {
    label: "Carta do Dia",
    description: "Reflita sobre a carta de hoje",
    icon: <Sun className="h-6 w-6" />,
    placeholder: "O que essa carta te diz sobre o momento que você está vivendo?",
  },
  reading: {
    label: "Leitura",
    description: "Reflita sobre uma leitura anterior",
    icon: <Sparkles className="h-6 w-6" />,
    placeholder: "O que mudou desde essa leitura?",
  },
  free: {
    label: "Livre",
    description: "Escreva livremente",
    icon: <Feather className="h-6 w-6" />,
    placeholder: "O que está no seu coração agora?",
  },
};

type Step = "type" | "reference" | "form";

export function EntryForm({
  preselectedType,
  preselectedDailyCardId,
  preselectedInterpretationId,
  recentDailyCards,
  recentReadings,
}: EntryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<Step>(() => {
    if (preselectedType) {
      // If reference is also preselected or type is free, skip to form
      if (
        preselectedType === "free" ||
        (preselectedType === "daily-card" && preselectedDailyCardId) ||
        (preselectedType === "reading" && preselectedInterpretationId)
      ) {
        return "form";
      }
      return "reference";
    }
    return "type";
  });

  const [selectedType, setSelectedType] = useState<EntryType>(
    preselectedType ?? "free"
  );
  const [selectedDailyCardId, setSelectedDailyCardId] = useState<string>(
    preselectedDailyCardId ?? ""
  );
  const [selectedInterpretationId, setSelectedInterpretationId] = useState<string>(
    preselectedInterpretationId ?? ""
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const handleSelectType = (type: EntryType) => {
    setSelectedType(type);
    setSelectedDailyCardId("");
    setSelectedInterpretationId("");
    if (type === "free") {
      setStep("form");
    } else {
      setStep("reference");
    }
  };

  const handleSelectReference = () => {
    setStep("form");
  };

  const handleSubmit = () => {
    if (!body.trim()) return;

    const toastId = toast.loading("Salvando reflexão...");

    startTransition(async () => {
      const result = await createDiaryEntryAction({
        type: selectedType,
        title: title.trim() || undefined,
        body: body.trim(),
        dailyCardId: selectedDailyCardId || undefined,
        interpretationId: selectedInterpretationId || undefined,
      });

      if ("error" in result) {
        toast.update(toastId, {
          render: result.error,
          type: "error",
          isLoading: false,
          autoClose: 4000,
        });
      } else {
        toast.update(toastId, {
          render: "Reflexão salva com sucesso!",
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
        router.push("/diario");
      }
    });
  };

  const meta = TYPE_META[selectedType];

  return (
    <div>
      {/* Step 1: Type Selection */}
      {step === "type" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Que tipo de reflexão você quer registrar?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(["daily-card", "reading", "free"] as EntryType[]).map((type) => {
              const m = TYPE_META[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSelectType(type)}
                  className="group flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center shadow-sm hover:shadow-md hover:border-ring transition-all"
                >
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                    {m.icon}
                  </span>
                  <div>
                    <p className="font-semibold">{m.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {m.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Reference Selection */}
      {step === "reference" && (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setStep("type")}>
            ← Voltar
          </Button>

          {selectedType === "daily-card" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Selecione a carta do dia sobre a qual deseja refletir:
              </p>
              {recentDailyCards.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhuma carta do dia disponível.
                </p>
              ) : (
                <div className="space-y-2">
                  {recentDailyCards.map((dc) => (
                    <button
                      key={dc._id}
                      type="button"
                      onClick={() => {
                        setSelectedDailyCardId(dc._id);
                        handleSelectReference();
                      }}
                      className={`group flex items-center gap-3 w-full rounded-lg border p-3 text-left transition-colors hover:border-ring ${
                        selectedDailyCardId === dc._id
                          ? "border-ring bg-ring/5"
                          : "border-border bg-card"
                      }`}
                    >
                      {dc.cardImage && (
                        <img
                          src={dc.cardImage}
                          alt={dc.cardName}
                          className="h-12 w-8 object-cover rounded flex-shrink-0"
                        />
                      )}
                      <div>
                        <p className="font-medium text-sm">{dc.cardName}</p>
                        <p className="text-xs text-muted-foreground">{dc.date}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedType === "reading" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Selecione a leitura sobre a qual deseja refletir:
              </p>
              {recentReadings.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhuma leitura disponível.
                </p>
              ) : (
                <div className="space-y-2">
                  {recentReadings.map((reading) => (
                    <button
                      key={reading._id}
                      type="button"
                      onClick={() => {
                        setSelectedInterpretationId(reading._id);
                        handleSelectReference();
                      }}
                      className={`group flex flex-col gap-1 w-full rounded-lg border p-3 text-left transition-colors hover:border-ring ${
                        selectedInterpretationId === reading._id
                          ? "border-ring bg-ring/5"
                          : "border-border bg-card"
                      }`}
                    >
                      <p className="font-medium text-sm line-clamp-2">
                        {reading.context}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {reading.deckName} &middot; {reading.createdAt}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Form */}
      {step === "form" && (
        <div className="space-y-4">
          {!preselectedType && (
            <Button
              variant="ghost"
              onClick={() =>
                selectedType === "free" ? setStep("type") : setStep("reference")
              }
            >
              ← Voltar
            </Button>
          )}

          <div className="space-y-4 rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              {meta.icon}
              <span className="font-medium text-foreground">{meta.label}</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="entry-title">Título (opcional)</Label>
              <Input
                id="entry-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Dê um título para esta reflexão..."
                maxLength={200}
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="entry-body">Reflexão</Label>
              <Textarea
                id="entry-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={meta.placeholder}
                rows={8}
                maxLength={10000}
                required
                disabled={isPending}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {body.length}/10.000
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isPending || !body.trim()}
              className="w-full"
            >
              {isPending ? "Salvando..." : "Salvar Reflexão"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
