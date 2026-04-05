import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Adicionar Carta</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={addCardAction} className="space-y-4">
          <input type="hidden" name="deckId" value={id} />
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image">Imagem</Label>
            <input
              id="image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium"
            />
            <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP. Máximo 5MB.</p>
          </div>
          <Button type="submit">Adicionar Carta</Button>
        </form>
      </CardContent>
    </Card>
  );
}
