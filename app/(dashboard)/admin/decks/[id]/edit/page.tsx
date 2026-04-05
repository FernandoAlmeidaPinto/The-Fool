import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect, notFound } from "next/navigation";
import { getDeckById } from "@/lib/decks/service";
import { countPendingCombinations } from "@/lib/readings/service";
import { DECK_TYPES, DECK_TYPE_LABELS, parseAspectRatio } from "@/lib/decks/constants";
import { AspectRatioSelect } from "@/components/aspect-ratio-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
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

  const pendingCombinations = await countPendingCombinations(id);

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
              <Label>Descrição</Label>
              <RichTextEditor content={deck.description} name="description" placeholder="Descrição do baralho" />
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
            <AspectRatioSelect defaultValue={deck.cardAspectRatio} />
            <div className="space-y-2">
              <Label htmlFor="coverImage">Imagem de Capa (opcional)</Label>
              {deck.coverImage && (
                <img src={deck.coverImage} alt="Capa atual" className="w-32 rounded-md border border-border" />
              )}
              <Input id="coverImage" name="coverImage" type="file" accept="image/jpeg,image/png,image/webp" />
              <p className="text-xs text-muted-foreground">
                {deck.coverImage ? "Envie uma nova imagem para substituir." : "Se não informada, usa a imagem da primeira carta."}
              </p>
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
                aspectRatio={parseAspectRatio(deck.cardAspectRatio).cssValue}
              />
            ))}
          </div>
        )}
      </div>

      {/* Combinations link */}
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/decks/${id}/combinacoes`}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Gerenciar Combinações
          {pendingCombinations > 0 && (
            <span className="ml-1 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-800">
              {pendingCombinations} pendente{pendingCombinations > 1 ? "s" : ""}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}
