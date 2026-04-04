import type { Session } from "next-auth";
import type { Permission } from "./constants";

export function hasPermission(
  session: Session | null,
  permission: Permission
): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const permissions = (session?.user as any)?.permissions as string[] | undefined;
  return permissions?.includes(permission) ?? false;
}

export function hasAnyPermission(
  session: Session | null,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(session, p));
}
