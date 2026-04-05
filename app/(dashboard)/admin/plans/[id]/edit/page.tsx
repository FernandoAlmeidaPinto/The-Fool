import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect, notFound } from "next/navigation";
import { getPlanById } from "@/lib/plans/service";
import { listProfiles } from "@/lib/profiles/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { updatePlanAction } from "../../actions";

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_PLANS)) {
    redirect("/");
  }

  const { id } = await params;
  const [plan, profiles] = await Promise.all([
    getPlanById(id),
    listProfiles(),
  ]);

  if (!plan) notFound();

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Editar Plano: {plan.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={updatePlanAction} className="space-y-4">
          <input type="hidden" name="id" value={plan._id.toString()} />
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" defaultValue={plan.name} required />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <RichTextEditor content={plan.description} name="description" placeholder="Descrição do plano" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profileId">Perfil de permissões</Label>
            <select
              id="profileId"
              name="profileId"
              required
              defaultValue={plan.profileId.toString()}
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
              defaultValue={(plan.price / 100).toFixed(2)}
            />
          </div>
          <input type="hidden" name="currency" value="BRL" />
          <div className="space-y-2">
            <Label htmlFor="interval">Intervalo</Label>
            <select
              id="interval"
              name="interval"
              defaultValue={plan.interval}
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
                defaultValue={plan.readingsMonthlyLimit?.toString() ?? ""}
                placeholder="Vazio = ilimitado"
              />
              <p className="text-xs text-muted-foreground">Deixe vazio para ilimitado.</p>
            </div>
          </div>

          <Button type="submit">Salvar Alterações</Button>
        </form>
      </CardContent>
    </Card>
  );
}
