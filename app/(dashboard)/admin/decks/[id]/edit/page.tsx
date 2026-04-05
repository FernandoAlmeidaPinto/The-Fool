import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect, notFound } from "next/navigation";
import { getDeckById } from "@/lib/decks/service";
import { DECK_TYPES, DECK_TYPE_LABELS } from "@/lib/decks/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CardThumbnail } from "@/components/card-thumbnail";
import Link from "next/link";
import { updateDeckAction } from "../../actions";

export default async function EditDeckPage({
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

  const deckTypes = Object.values(DECK_TYPES);
  const sortedCards = [...deck.cards].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-8">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Editar Baralho: {deck.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateDeckAction} className="space-y-4">
            <input type="hidden" name="id" value={deck._id.toString()} />
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" defaultValue={deck.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" name="description" defaultValue={deck.description} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <select
                id="type"
                name="type"
                defaultValue={deck.type}
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
            <Button type="submit">Salvar Alterações</Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            Cartas ({sortedCards.length})
          </h2>
          <Link href={`/admin/decks/${deck._id}/cards/new`}>
            <Button>Adicionar Carta</Button>
          </Link>
        </div>

        {sortedCards.length === 0 ? (
          <p className="text-muted-foreground">Nenhuma carta adicionada ainda.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sortedCards.map((card) => (
              <CardThumbnail
                key={card._id.toString()}
                href={`/admin/decks/${deck._id}/cards/${card._id}/edit`}
                title={card.title}
                image={card.image ?? null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
