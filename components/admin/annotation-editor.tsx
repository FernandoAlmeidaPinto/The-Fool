"use client";

import { useState, useRef, useTransition, useCallback } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { stripHtml } from "@/lib/html/strip";

type AnnotationData = {
  _id: string;
  x: number;
  y: number;
  title: string;
  description: string;
  order: number;
};

interface AnnotationEditorProps {
  deckId: string;
  cardId: string;
  cardImage: string;
  cardAspectRatio: string;
  initialAnnotations: AnnotationData[];
  createAction: (data: {
    deckId: string;
    cardId: string;
    x: number;
    y: number;
    title: string;
    description: string;
  }) => Promise<AnnotationData>;
  updateAction: (data: {
    deckId: string;
    cardId: string;
    annotationId: string;
    x?: number;
    y?: number;
    title?: string;
    description?: string;
  }) => Promise<AnnotationData | null>;
  deleteAction: (data: {
    deckId: string;
    cardId: string;
    annotationId: string;
  }) => Promise<void>;
}

type Mode = "idle" | "creating" | "editing" | "repositioning";

export function AnnotationEditor({
  deckId,
  cardId,
  cardImage,
  cardAspectRatio,
  initialAnnotations,
  createAction,
  updateAction,
  deleteAction,
}: AnnotationEditorProps) {
  const [annotations, setAnnotations] = useState<AnnotationData[]>(initialAnnotations);
  const [mode, setMode] = useState<Mode>("idle");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingCoords, setPendingCoords] = useState<{ x: number; y: number } | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedAnnotation = selectedId
    ? annotations.find((a) => a._id === selectedId) ?? null
    : null;

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = Math.round(((e.clientX - rect.left) / rect.width) * 10000) / 100;
      const y = Math.round(((e.clientY - rect.top) / rect.height) * 10000) / 100;

      if (mode === "idle" || mode === "creating") {
        // Start creating mode
        setPendingCoords({ x, y });
        setMode("creating");
        setTitle("");
        setDescription("");
        setSelectedId(null);
        setError(null);
      } else if (mode === "repositioning" && selectedId) {
        // Update position
        setPendingCoords({ x, y });
        startTransition(async () => {
          try {
            setError(null);
            const result = await updateAction({
              deckId,
              cardId,
              annotationId: selectedId,
              x,
              y,
            });
            if (result) {
              setAnnotations((prev) =>
                prev.map((a) =>
                  a._id === selectedId ? { ...a, x, y } : a
                )
              );
            }
            toast.success("Posição atualizada!");
            setMode("editing");
            setPendingCoords(null);
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Erro ao reposicionar";
            toast.error(msg);
            setError(msg);
          }
        });
      }
    },
    [mode, selectedId, deckId, cardId, updateAction]
  );

  const handleDotClick = useCallback(
    (e: React.MouseEvent, annotation: AnnotationData) => {
      e.stopPropagation();
      if (mode === "repositioning") return;
      setSelectedId(annotation._id);
      setTitle(annotation.title);
      setDescription(annotation.description);
      setMode("editing");
      setPendingCoords(null);
      setError(null);
    },
    [mode]
  );

  const handleCreate = useCallback(() => {
    if (!pendingCoords || !title.trim()) return;
    const toastId = toast.loading("Criando anotação...");
    startTransition(async () => {
      try {
        setError(null);
        const result = await createAction({
          deckId,
          cardId,
          x: pendingCoords.x,
          y: pendingCoords.y,
          title: title.trim(),
          description,
        });
        if (result) {
          const newAnnotation: AnnotationData = {
            _id: result._id?.toString?.() ?? result._id,
            x: result.x,
            y: result.y,
            title: result.title,
            description: result.description,
            order: result.order,
          };
          setAnnotations((prev) => [...prev, newAnnotation]);
        }
        toast.update(toastId, {
          render: "Anotação criada!",
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
        setMode("idle");
        setPendingCoords(null);
        setTitle("");
        setDescription("");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao criar anotação";
        toast.update(toastId, {
          render: msg,
          type: "error",
          isLoading: false,
          autoClose: 4000,
        });
        setError(msg);
      }
    });
  }, [pendingCoords, title, description, deckId, cardId, createAction]);

  const handleUpdate = useCallback(() => {
    if (!selectedId || !title.trim()) return;
    const toastId = toast.loading("Salvando alterações...");
    startTransition(async () => {
      try {
        setError(null);
        const result = await updateAction({
          deckId,
          cardId,
          annotationId: selectedId,
          title: title.trim(),
          description,
        });
        if (result) {
          setAnnotations((prev) =>
            prev.map((a) =>
              a._id === selectedId
                ? { ...a, title: title.trim(), description }
                : a
            )
          );
        }
        toast.update(toastId, {
          render: "Anotação atualizada!",
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
        setMode("idle");
        setSelectedId(null);
        setTitle("");
        setDescription("");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao atualizar anotação";
        toast.update(toastId, {
          render: msg,
          type: "error",
          isLoading: false,
          autoClose: 4000,
        });
        setError(msg);
      }
    });
  }, [selectedId, title, description, deckId, cardId, updateAction]);

  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    if (!confirm("Tem certeza que deseja remover esta anotação?")) return;
    const toastId = toast.loading("Removendo anotação...");
    startTransition(async () => {
      try {
        setError(null);
        await deleteAction({ deckId, cardId, annotationId: selectedId });
        setAnnotations((prev) => prev.filter((a) => a._id !== selectedId));
        toast.update(toastId, {
          render: "Anotação removida!",
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
        setMode("idle");
        setSelectedId(null);
        setTitle("");
        setDescription("");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao remover anotação";
        toast.update(toastId, {
          render: msg,
          type: "error",
          isLoading: false,
          autoClose: 4000,
        });
        setError(msg);
      }
    });
  }, [selectedId, deckId, cardId, deleteAction]);

  const handleReposition = useCallback(() => {
    setMode("repositioning");
    setPendingCoords(null);
  }, []);

  const handleCancel = useCallback(() => {
    setMode("idle");
    setSelectedId(null);
    setPendingCoords(null);
    setTitle("");
    setDescription("");
    setError(null);
  }, []);

  const sortedAnnotations = [...annotations].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Image with annotation dots */}
      <div className="flex-shrink-0 lg:w-1/2">
        <div
          ref={containerRef}
          className="relative cursor-crosshair overflow-hidden rounded-lg border border-border"
          style={{ aspectRatio: cardAspectRatio }}
          onClick={handleImageClick}
        >
          <img
            src={cardImage}
            alt="Carta"
            className="pointer-events-none object-contain w-full h-full"
          />

          {/* Existing annotation dots */}
          {sortedAnnotations.map((annotation, index) => (
            <button
              key={annotation._id}
              type="button"
              className={`absolute z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold text-white transition-transform hover:scale-125 ${
                selectedId === annotation._id
                  ? "bg-blue-500 ring-2 ring-white"
                  : "bg-red-500/90"
              }`}
              style={{
                left: `${annotation.x}%`,
                top: `${annotation.y}%`,
              }}
              onClick={(e) => handleDotClick(e, annotation)}
            >
              {index + 1}
            </button>
          ))}

          {/* Pending dot (creating mode) */}
          {mode === "creating" && pendingCoords && (
            <div
              className="absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-green-400"
              style={{
                left: `${pendingCoords.x}%`,
                top: `${pendingCoords.y}%`,
              }}
            />
          )}

          {/* Repositioning indicator */}
          {mode === "repositioning" && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20">
              <span className="rounded-md bg-black/70 px-3 py-1.5 text-sm font-medium text-white">
                Clique na nova posição
              </span>
            </div>
          )}
        </div>

        {/* Instruction text */}
        <p className="mt-2 text-xs text-muted-foreground">
          {mode === "idle" && "Clique na imagem para adicionar uma anotação."}
          {mode === "creating" && "Preencha os campos ao lado e salve."}
          {mode === "editing" && "Edite os campos ao lado ou reposicione/remova."}
          {mode === "repositioning" && "Clique na imagem para definir a nova posição."}
        </p>
      </div>

      {/* Form / List panel */}
      <div className="flex-1 space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Form (creating or editing) */}
        {(mode === "creating" || mode === "editing" || mode === "repositioning") && (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold">
              {mode === "creating"
                ? "Nova Anotação"
                : `Editando Anotação — ${selectedAnnotation?.title ?? ""}`}
            </h3>

            <div className="space-y-1.5">
              <Label htmlFor="ann-title">Título</Label>
              <Input
                id="ann-title"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                placeholder="Título da anotação"
                maxLength={80}
                disabled={isPending}
              />
              <span className="text-xs text-muted-foreground">
                {title.length}/80
              </span>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <RichTextEditor
                key={selectedId ?? (pendingCoords ? `${pendingCoords.x}-${pendingCoords.y}` : "new")}
                content={description}
                onChange={setDescription}
                placeholder="Descrição da anotação"
                maxLength={1000}
                disabled={isPending}
              />
            </div>

            {pendingCoords && (
              <p className="text-xs text-muted-foreground">
                Posição: {pendingCoords.x.toFixed(1)}%, {pendingCoords.y.toFixed(1)}%
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {mode === "creating" && (
                <Button
                  onClick={handleCreate}
                  disabled={isPending || !title.trim() || !pendingCoords}
                >
                  {isPending ? "Salvando..." : "Salvar"}
                </Button>
              )}

              {(mode === "editing" || mode === "repositioning") && (
                <>
                  <Button
                    onClick={handleUpdate}
                    disabled={isPending || !title.trim()}
                  >
                    {isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                  {mode === "editing" && (
                    <Button
                      variant="outline"
                      onClick={handleReposition}
                      disabled={isPending}
                    >
                      Reposicionar
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isPending}
                  >
                    Remover
                  </Button>
                </>
              )}

              <Button variant="ghost" onClick={handleCancel} disabled={isPending}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Annotation list (shown in idle mode when there are annotations) */}
        {mode === "idle" && sortedAnnotations.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">
              Anotações ({sortedAnnotations.length})
            </h3>
            <ul className="space-y-1.5">
              {sortedAnnotations.map((annotation, index) => (
                <li key={annotation._id}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 rounded-md border border-border p-2.5 text-left text-sm transition-colors hover:bg-muted"
                    onClick={() => {
                      setSelectedId(annotation._id);
                      setTitle(annotation.title);
                      setDescription(annotation.description);
                      setMode("editing");
                      setError(null);
                    }}
                  >
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-500/90 text-[10px] font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium leading-tight">{annotation.title}</p>
                      {annotation.description && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {stripHtml(annotation.description)}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {mode === "idle" && sortedAnnotations.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma anotação. Clique na imagem para criar a primeira.
          </p>
        )}
      </div>

    </div>
  );
}
