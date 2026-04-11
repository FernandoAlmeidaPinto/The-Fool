import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect, notFound } from "next/navigation";
import { getPracticeQuestionById } from "@/lib/readings/practice-question-service";
import { listDecks } from "@/lib/decks/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  updatePracticeQuestionAction,
  deletePracticeQuestionAction,
} from "../actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPracticeQuestionPage({ params }: Props) {
  const session = await auth();
  if (
    !session?.user ||
    !hasPermission(session, PERMISSIONS.ADMIN_PRACTICE_QUESTIONS)
  ) {
    redirect("/");
  }

  const { id } = await params;
  const [question, decks] = await Promise.all([
    getPracticeQuestionById(id),
    listDecks(),
  ]);

  if (!question) notFound();

  const deckIdValue = question.deckId ? question.deckId.toString() : "global";

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Editar Pergunta de Treino</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={updatePracticeQuestionAction} className="space-y-4">
          <input type="hidden" name="id" value={question._id.toString()} />

          <div className="space-y-2">
            <Label htmlFor="text">Pergunta</Label>
            <textarea
              id="text"
              name="text"
              rows={4}
              required
              defaultValue={question.text}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deckId">Baralho</Label>
            <select
              id="deckId"
              name="deckId"
              defaultValue={deckIdValue}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="global">Global (qualquer baralho)</option>
              {decks.map((d) => (
                <option key={d._id.toString()} value={d._id.toString()}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              name="active"
              defaultChecked={question.active}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="active" className="cursor-pointer">
              Ativa
            </Label>
          </div>

          <div className="flex gap-2">
            <Button type="submit">Salvar</Button>
          </div>
        </form>

        <form action={deletePracticeQuestionAction} className="mt-6 border-t border-border pt-4">
          <input type="hidden" name="id" value={question._id.toString()} />
          <Button type="submit" variant="destructive">
            Excluir Pergunta
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
