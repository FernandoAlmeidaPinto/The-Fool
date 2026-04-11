import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { listPracticeQuestions } from "@/lib/readings/practice-question-service";
import { listDecks } from "@/lib/decks/service";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  searchParams: Promise<{
    page?: string;
    deck?: string;
    status?: string;
  }>;
}

const PER_PAGE = 20;

export default async function PracticeQuestionsPage({ searchParams }: Props) {
  const session = await auth();
  if (
    !session?.user ||
    !hasPermission(session, PERMISSIONS.ADMIN_PRACTICE_QUESTIONS)
  ) {
    redirect("/");
  }

  const { page: pageParam, deck: deckParam, status: statusParam } =
    await searchParams;

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const deckFilter: "any" | "global" | string =
    !deckParam || deckParam === "any"
      ? "any"
      : deckParam === "global"
        ? "global"
        : deckParam;

  const activeFilter: boolean | "any" =
    statusParam === "active"
      ? true
      : statusParam === "inactive"
        ? false
        : "any";

  const [decks, result] = await Promise.all([
    listDecks(),
    listPracticeQuestions({
      page,
      perPage: PER_PAGE,
      deckId: deckFilter,
      active: activeFilter,
    }),
  ]);

  const deckMap = new Map(decks.map((d) => [d._id.toString(), d.name]));

  const totalPages = Math.max(1, Math.ceil(result.total / PER_PAGE));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">
          Perguntas de Treino
        </h1>
        <Link href="/admin/practice-questions/new">
          <Button>Nova Pergunta</Button>
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 mb-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Baralho
          </label>
          <select
            name="deck"
            defaultValue={deckParam ?? "any"}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          >
            <option value="any">Todos</option>
            <option value="global">Global</option>
            {decks.map((d) => (
              <option key={d._id.toString()} value={d._id.toString()}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Status
          </label>
          <select
            name="status"
            defaultValue={statusParam ?? "any"}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          >
            <option value="any">Todos</option>
            <option value="active">Ativas</option>
            <option value="inactive">Inativas</option>
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pergunta</TableHead>
            <TableHead>Baralho</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                Nenhuma pergunta encontrada.
              </TableCell>
            </TableRow>
          ) : (
            result.items.map((q) => (
              <TableRow key={q._id.toString()}>
                <TableCell className="font-medium max-w-xl">
                  <span className="line-clamp-2">{q.text}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {q.deckId
                    ? (deckMap.get(q.deckId.toString()) ?? "—")
                    : "Global"}
                </TableCell>
                <TableCell>
                  <Badge variant={q.active ? "default" : "secondary"}>
                    {q.active ? "Ativa" : "Inativa"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link href={`/admin/practice-questions/${q._id.toString()}`}>
                    <Button variant="outline" size="sm">
                      Editar
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          {page > 1 && (
            <Link
              href={`/admin/practice-questions?page=${page - 1}${deckParam ? `&deck=${deckParam}` : ""}${statusParam ? `&status=${statusParam}` : ""}`}
              className="text-sm underline"
            >
              Anterior
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/practice-questions?page=${page + 1}${deckParam ? `&deck=${deckParam}` : ""}${statusParam ? `&status=${statusParam}` : ""}`}
              className="text-sm underline"
            >
              Próxima
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
