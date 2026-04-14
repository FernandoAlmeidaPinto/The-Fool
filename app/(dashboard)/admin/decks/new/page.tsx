import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { DECK_TYPES, DECK_TYPE_LABELS } from "@/lib/decks/constants";
import { AspectRatioSelect } from "@/components/aspect-ratio-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { AdminForm } from "@/components/admin/admin-form";
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
        <AdminForm
          action={createDeckAction}
          loadingMessage="Criando baralho..."
          successMessage="Baralho criado com sucesso!"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <RichTextEditor content="" name="description" placeholder="Descrição do baralho" />
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
          <AspectRatioSelect />
          <div className="space-y-2">
            <Label htmlFor="coverImage">Imagem de Capa (opcional)</Label>
            <Input id="coverImage" name="coverImage" type="file" accept="image/jpeg,image/png,image/webp" />
            <p className="text-xs text-muted-foreground">Se não informada, usa a imagem da primeira carta.</p>
          </div>
          <Button type="submit">Criar Baralho</Button>
        </AdminForm>
      </CardContent>
    </Card>
  );
}
