import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { listDecks } from "@/lib/decks/service";
import { DECK_TYPE_LABELS } from "@/lib/decks/constants";
import type { DeckType } from "@/lib/decks/constants";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default async function DecksPage() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_DECKS)) {
    redirect("/");
  }

  const decks = await listDecks();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Baralhos</h1>
        <Link href="/admin/decks/new">
          <Button>Novo Baralho</Button>
        </Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Cartas</TableHead>
            <TableHead className="w-24">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {decks.map((deck) => (
            <TableRow key={deck._id.toString()}>
              <TableCell className="font-medium">{deck.name}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {DECK_TYPE_LABELS[deck.type as DeckType] ?? deck.type}
                </Badge>
              </TableCell>
              <TableCell>{deck.cards.length}</TableCell>
              <TableCell>
                <Link href={`/admin/decks/${deck._id}/edit`}>
                  <Button variant="outline" size="sm">Editar</Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
