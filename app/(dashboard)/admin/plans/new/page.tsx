import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { listProfiles } from "@/lib/profiles/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { createPlanAction } from "../actions";

export default async function NewPlanPage() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_PLANS)) {
    redirect("/");
  }

  const profiles = await listProfiles();

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>New Plan</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createPlanAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <RichTextEditor content="" name="description" placeholder="Descrição do plano" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price (R$)</Label>
            <Input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="19.90"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" name="currency" defaultValue="BRL" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interval">Interval</Label>
            <select
              id="interval"
              name="interval"
              defaultValue="monthly"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="one_time">One Time</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="readingsMonthlyLimit">Leituras por mês</Label>
            <Input
              id="readingsMonthlyLimit"
              name="readingsMonthlyLimit"
              type="number"
              min="0"
              placeholder="Vazio = ilimitado"
            />
            <p className="text-xs text-muted-foreground">Deixe vazio para ilimitado.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profileId">Profile</Label>
            <select
              id="profileId"
              name="profileId"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select a profile</option>
              {profiles.map((profile) => (
                <option key={profile._id.toString()} value={profile._id.toString()}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">Create Plan</Button>
        </form>
      </CardContent>
    </Card>
  );
}
