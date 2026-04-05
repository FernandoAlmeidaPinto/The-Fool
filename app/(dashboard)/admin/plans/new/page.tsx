import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { listProfiles } from "@/lib/profiles/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { createPlanAction } from "../actions";

export default async function NewPlanPage() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_PLANS)) {
    redirect("/");
  }

  const profiles = await listProfiles();

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Novo Plano</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createPlanAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <RichTextEditor content="" name="description" placeholder="Descrição do plano" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profileId">Perfil de permissões</Label>
            <select
              id="profileId"
              name="profileId"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Selecione um perfil</option>
              {profiles.map((profile) => (
                <option key={profile._id.toString()} value={profile._id.toString()}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Preço (R$)</Label>
            <Input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="19,90"
            />
          </div>
          <input type="hidden" name="currency" value="BRL" />
          <div className="space-y-2">
            <Label htmlFor="interval">Intervalo</Label>
            <select
              id="interval"
              name="interval"
              defaultValue="monthly"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="monthly">Mensal</option>
              <option value="yearly">Anual</option>
              <option value="one_time">Único</option>
            </select>
          </div>

          {/* Limites */}
          <div className="border-t border-border pt-4 mt-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Limites</h3>
            <div className="space-y-2">
              <Label htmlFor="readingsMonthlyLimit">Leituras por mês</Label>
              <Input
                id="readingsMonthlyLimit"
                name="readingsMonthlyLimit"
                type="number"
                min="0"
                placeholder="Vazio = ilimitado"
              />
              <p className="text-xs text-muted-foreground">Deixe vazio para ilimitado.</p>
            </div>
          </div>

          <Button type="submit">Criar Plano</Button>
        </form>
      </CardContent>
    </Card>
  );
}
