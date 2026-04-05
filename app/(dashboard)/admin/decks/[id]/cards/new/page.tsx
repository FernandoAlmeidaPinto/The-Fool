import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect, notFound } from "next/navigation";
import { getDeckById } from "@/lib/decks/service";
import { parseAspectRatio } from "@/lib/decks/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageCropUpload } from "@/components/image-crop-upload";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { addCardAction } from "../../../actions";

export default async function NewCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_DECKS)) {
    redirect("/");
  }

  const { id } = await params;
  const deck = await getDeckById(id);
  if (!deck) notFound();

  const { cssValue } = parseAspectRatio(deck.cardAspectRatio);
  const [w, h] = cssValue.split("/").map(Number);
  const numericRatio = w / h;

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Adicionar Carta — {deck.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={addCardAction} className="space-y-4">
          <input type="hidden" name="deckId" value={id} />
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <RichTextEditor content="" name="description" placeholder="Descrição da carta" />
          </div>
          <ImageCropUpload
            name="image"
            aspectRatio={numericRatio}
            required
          />
          <Button type="submit">Adicionar Carta</Button>
        </form>
      </CardContent>
    </Card>
  );
}
