"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { register } from "@/lib/auth/auth-actions";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(register, null);
  const toastId = useRef<ReturnType<typeof toast.loading> | null>(null);
  const prevPending = useRef(false);

  useEffect(() => {
    if (pending && !prevPending.current) {
      toastId.current = toast.loading("Cadastrando...");
    }

    if (!pending && prevPending.current && toastId.current !== null) {
      if (state?.error) {
        toast.update(toastId.current, {
          render: state.error,
          type: "error",
          isLoading: false,
          autoClose: 4000,
        });
      } else {
        toast.update(toastId.current, {
          render: "Conta criada com sucesso!",
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
      }
      toastId.current = null;
    }

    prevPending.current = pending;
  }, [pending, state]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Criar Conta</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" type="text" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link href="/auth/login" className="text-primary underline">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
