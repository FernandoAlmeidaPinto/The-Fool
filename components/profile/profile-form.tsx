"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageCropUpload } from "@/components/image-crop-upload";
import { updateProfileAction } from "@/app/(dashboard)/perfil/actions";

interface ProfileFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    birthDate: string | null; // ISO string or null
  };
  plan: {
    name: string;
    limits: {
      label: string;
      used: number;
      limit: number | null; // null = unlimited
    }[];
  };
}

export function ProfileForm({ user, plan }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      setMessage(null);
      const result = await updateProfileAction(formData);
      if (result.success) {
        setMessage({ type: "success", text: "Perfil atualizado com sucesso" });
      } else {
        setMessage({ type: "error", text: result.error ?? "Erro ao salvar" });
      }
    });
  };

  // Get initials for avatar fallback
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-8">
      {/* Section 1: Personal Info */}
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-6 space-y-5">
          <h3 className="text-lg font-semibold">Dados Pessoais</h3>

          {message && (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                message.type === "success"
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-24 w-24 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground border border-border">
                  {initials}
                </div>
              )}
            </div>
            <div className="flex-1">
              <ImageCropUpload
                name="avatar"
                aspectRatio={1}
                currentImage={user.avatar}
                label="Foto de perfil"
              />
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              defaultValue={user.name}
              required
              disabled={isPending}
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-1.5">
            <Label>Email</Label>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>

          {/* Birth date */}
          <div className="space-y-1.5">
            <Label htmlFor="birthDate">Data de Nascimento</Label>
            <Input
              id="birthDate"
              name="birthDate"
              type="date"
              defaultValue={user.birthDate ?? ""}
              disabled={isPending}
            />
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>

      {/* Section 2: Meu Plano */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h3 className="text-lg font-semibold">Meu Plano</h3>
        <p className="text-sm font-medium">{plan.name}</p>

        {plan.limits.length > 0 && (
          <div className="space-y-3">
            {plan.limits.map((limit) => (
              <div key={limit.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{limit.label}</span>
                  <span className="text-muted-foreground">
                    {limit.limit === null
                      ? "Ilimitado"
                      : `${limit.used} de ${limit.limit} usadas`}
                  </span>
                </div>
                {limit.limit !== null && (
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(100, (limit.used / limit.limit) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
