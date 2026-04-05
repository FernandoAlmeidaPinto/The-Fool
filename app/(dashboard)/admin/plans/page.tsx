import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { listPlans } from "@/lib/plans/service";
import { listProfiles } from "@/lib/profiles/service";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { togglePlanActiveAction } from "./actions";

export default async function PlansPage() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_PLANS)) {
    redirect("/");
  }

  const [plans, profiles] = await Promise.all([listPlans(), listProfiles()]);

  const profileMap = new Map(
    profiles.map((p) => [p._id.toString(), p.name])
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Plans</h1>
        <Link href="/admin/plans/new">
          <Button>New Plan</Button>
        </Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Interval</TableHead>
            <TableHead>Profile</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-36">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => (
            <TableRow key={plan._id.toString()}>
              <TableCell className="font-medium">{plan.name}</TableCell>
              <TableCell>
                {(plan.price / 100).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: plan.currency,
                })}
              </TableCell>
              <TableCell className="text-muted-foreground">{plan.interval}</TableCell>
              <TableCell className="text-muted-foreground">
                {profileMap.get(plan.profileId.toString()) ?? "—"}
              </TableCell>
              <TableCell>
                <Badge variant={plan.active ? "default" : "secondary"}>
                  {plan.active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/plans/${plan._id}/edit`}>
                    <Button variant="outline" size="sm">Edit</Button>
                  </Link>
                  <form action={togglePlanActiveAction}>
                    <input type="hidden" name="id" value={plan._id.toString()} />
                    <Button variant="ghost" size="sm" type="submit">
                      {plan.active ? "Deactivate" : "Activate"}
                    </Button>
                  </form>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
