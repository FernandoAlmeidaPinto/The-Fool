import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect, notFound } from "next/navigation";
import { getPlanById } from "@/lib/plans/service";
import { listProfiles } from "@/lib/profiles/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { updatePlanAction } from "../../actions";

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_PLANS)) {
    redirect("/");
  }

  const { id } = await params;
  const [plan, profiles] = await Promise.all([
    getPlanById(id),
    listProfiles(),
  ]);

  if (!plan) notFound();

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Edit Plan: {plan.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={updatePlanAction} className="space-y-4">
          <input type="hidden" name="id" value={plan._id.toString()} />
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={plan.name} required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <RichTextEditor content={plan.description} name="description" placeholder="Descrição do plano" />
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
              defaultValue={(plan.price / 100).toFixed(2)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" name="currency" defaultValue={plan.currency} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interval">Interval</Label>
            <select
              id="interval"
              name="interval"
              defaultValue={plan.interval}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="one_time">One Time</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profileId">Profile</Label>
            <select
              id="profileId"
              name="profileId"
              required
              defaultValue={plan.profileId.toString()}
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
          <Button type="submit">Save Changes</Button>
        </form>
      </CardContent>
    </Card>
  );
}
