import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect, notFound } from "next/navigation";
import { getDeckById, getCardFromDeck } from "@/lib/decks/service";
import { parseAspectRatio } from "@/lib/decks/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageCropUpload } from "@/components/image-crop-upload";
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
  const deck = await getDeckById(id);
  if (!deck) notFound();

  const result = await getCardFromDeck(id, cardId);
  if (!result) notFound();

  const { card } = result;
  const { cssValue } = parseAspectRatio(deck.cardAspectRatio);
  const [w, h] = cssValue.split("/").map(Number);
  const numericRatio = w / h;

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Editar Carta — {card.title}</CardTitle>
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
          <ImageCropUpload
            name="image"
            aspectRatio={numericRatio}
            currentImage={card.image}
            label="Imagem da Carta"
          />
          <Button type="submit">Salvar Alterações</Button>
        </form>
      </CardContent>
    </Card>
  );
}
