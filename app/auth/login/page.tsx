"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  loginWithCredentials,
  loginWithGoogle,
} from "@/lib/auth/auth-actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginWithCredentials, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Sign In</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>
          <form action={loginWithGoogle}>
            <Button type="submit" variant="outline" className="w-full">
              Entrar com Google
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Não tem uma conta?{" "}
            <Link href="/auth/register" className="text-primary underline">
              Cadastrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
