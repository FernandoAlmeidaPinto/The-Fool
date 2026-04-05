import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect, notFound } from "next/navigation";
import { getCardFromDeck } from "@/lib/decks/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateCardAction } from "../../../../actions";

export default async function EditCardPage({
  params,
}: {
  params: Promise<{ id: string; cardId: string }>;
}) {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_DECKS)) {
    redirect("/");
  }

  const { id, cardId } = await params;
  const result = await getCardFromDeck(id, cardId);
  if (!result) notFound();

  const { card } = result;

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Editar Carta: {card.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={updateCardAction} className="space-y-4">
          <input type="hidden" name="deckId" value={id} />
          <input type="hidden" name="cardId" value={card._id.toString()} />
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" defaultValue={card.title} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <textarea
              id="description"
              name="description"
              defaultValue={card.description}
              rows={4}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <Label>Imagem Atual</Label>
            <div className="aspect-[2/3] max-w-xs overflow-hidden rounded-md border bg-muted">
              <img
                src={card.image}
                alt={card.title}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="image">Substituir Imagem (opcional)</Label>
            <input
              id="image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium"
            />
            <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP. Máximo 5MB.</p>
          </div>
          <Button type="submit">Salvar Alterações</Button>
        </form>
      </CardContent>
    </Card>
  );
}
