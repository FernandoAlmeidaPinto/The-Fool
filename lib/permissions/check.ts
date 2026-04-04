import type { Session } from "next-auth";
import type { Permission } from "./constants";

export function hasPermission(
  session: Session | null,
  permission: Permission
): boolean {
  return session?.user?.permissions?.includes(permission) ?? false;
}

export function hasAnyPermission(
  session: Session | null,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(session, p));
}
