import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS, ALL_PERMISSIONS } from "@/lib/permissions/constants";
import { redirect, notFound } from "next/navigation";
import { getProfileById } from "@/lib/profiles/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateProfileAction } from "../../actions";

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_PROFILES)) {
    redirect("/");
  }

  const { id } = await params;
  const profile = await getProfileById(id);
  if (!profile) notFound();

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Edit Profile: {profile.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={updateProfileAction} className="space-y-4">
          <input type="hidden" name="id" value={profile._id.toString()} />
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={profile.name} required />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <p className="text-sm text-muted-foreground">{profile.slug}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" defaultValue={profile.description} />
          </div>
          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PERMISSIONS.map((perm) => (
                <label key={perm} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="permissions"
                    value={perm}
                    defaultChecked={profile.permissions.includes(perm)}
                    className="rounded border-input"
                  />
                  {perm}
                </label>
              ))}
            </div>
          </div>
          <Button type="submit">Save Changes</Button>
        </form>
      </CardContent>
    </Card>
  );
}
