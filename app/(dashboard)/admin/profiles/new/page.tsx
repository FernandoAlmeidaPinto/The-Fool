import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS, ALL_PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createProfileAction } from "../actions";

export default async function NewProfilePage() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_PROFILES)) {
    redirect("/");
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>New Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createProfileAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" required placeholder="e.g. premium" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" />
          </div>
          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PERMISSIONS.map((perm) => (
                <label key={perm} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="permissions" value={perm} className="rounded border-input" />
                  {perm}
                </label>
              ))}
            </div>
          </div>
          <Button type="submit">Create Profile</Button>
        </form>
      </CardContent>
    </Card>
  );
}
