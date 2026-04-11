import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { listDecks } from "@/lib/decks/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createPracticeQuestionAction } from "../actions";

export default async function NewPracticeQuestionPage() {
  const session = await auth();
  if (
    !session?.user ||
    !hasPermission(session, PERMISSIONS.ADMIN_PRACTICE_QUESTIONS)
  ) {
    redirect("/");
  }

  const decks = await listDecks();

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Nova Pergunta de Treino</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createPracticeQuestionAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="text">Pergunta</Label>
            <textarea
              id="text"
              name="text"
              rows={4}
              required
              placeholder="Ex: Como essas cartas responderiam alguém em dúvida sobre mudar de carreira?"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deckId">Baralho</Label>
            <select
              id="deckId"
              name="deckId"
              defaultValue="global"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="global">Global (qualquer baralho)</option>
              {decks.map((d) => (
                <option key={d._id.toString()} value={d._id.toString()}>
                  {d.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Escolha um baralho específico, ou mantenha Global para todos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              name="active"
              defaultChecked
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="active" className="cursor-pointer">
              Ativa
            </Label>
          </div>

          <div className="flex gap-2">
            <Button type="submit">Criar Pergunta</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
