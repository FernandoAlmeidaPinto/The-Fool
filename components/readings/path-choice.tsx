"use client";

import { GraduationCap, Sparkles } from "lucide-react";

export type ReadingPath = "practice" | "normal";

interface PathChoiceProps {
  onChoose: (path: ReadingPath) => void;
}

export function PathChoice({ onChoose }: PathChoiceProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-center">
        Como você quer seguir?
      </h3>

      <div className="rounded-lg border border-border overflow-hidden min-h-64 grid grid-cols-1 md:grid-cols-2">
        {/* Left: Practice */}
        <button
          type="button"
          onClick={() => onChoose("practice")}
          className="group flex flex-col items-center justify-center gap-3 p-6 text-center transition-colors hover:bg-muted/40 border-b md:border-b-0 md:border-r border-border appearance-none bg-transparent cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <GraduationCap className="h-10 w-10 text-primary/80 group-hover:text-primary transition-colors" />
          <div className="space-y-1.5">
            <h4 className="font-semibold text-foreground">
              Praticar interpretação
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              Receba uma pergunta e interprete como você acredita que as
              cartas responderiam. Não gostou da pergunta? Crie a sua
              própria. Depois, você receberá um feedback sincero sobre sua
              leitura.
            </p>
          </div>
        </button>

        {/* Right: Normal reading */}
        <button
          type="button"
          onClick={() => onChoose("normal")}
          className="group flex flex-col items-center justify-center gap-3 p-6 text-center transition-colors hover:bg-muted/40 appearance-none bg-transparent cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <Sparkles className="h-10 w-10 text-primary/80 group-hover:text-primary transition-colors" />
          <div className="space-y-1.5">
            <h4 className="font-semibold text-foreground">
              Fazer uma leitura
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              Escreva sua própria pergunta e receba a interpretação para as
              cartas selecionadas.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
