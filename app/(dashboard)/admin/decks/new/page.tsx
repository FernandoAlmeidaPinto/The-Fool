import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { DECK_TYPES, DECK_TYPE_LABELS, ASPECT_RATIO_PRESETS } from "@/lib/decks/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createDeckAction } from "../actions";

export default async function NewDeckPage() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_DECKS)) {
    redirect("/");
  }

  const deckTypes = Object.values(DECK_TYPES);

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Novo Baralho</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createDeckAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" name="description" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <select
              id="type"
              name="type"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {deckTypes.map((type) => (
                <option key={type} value={type}>
                  {DECK_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cardAspectRatio">Proporção das Cartas</Label>
            <select
              id="cardAspectRatio"
              name="cardAspectRatio"
              required
              defaultValue="2/3"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {ASPECT_RATIO_PRESETS.filter((p) => p.value !== "custom").map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <Button type="submit">Criar Baralho</Button>
        </form>
      </CardContent>
    </Card>
  );
}
