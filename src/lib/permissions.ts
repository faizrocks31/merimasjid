import { ROLES, type Role } from "@/lib/constants";

export type Permission =
  | "member:read"
  | "member:write"
  | "member:view-credentials"
  | "plan:write"
  | "payment:create"
  | "payment:read"
  | "payment:reverse"
  | "receipt:reprint"
  | "expense:create"
  | "expense:approve"
  | "report:read"
  | "export:data"
  | "settings:write"
  | "staff:manage"
  | "audit:read"
  | "tenant:manage"
  | "subscription:read"
  | "subscription:manage";

const MATRIX: Record<Role, Permission[]> = {
  [ROLES.SUPER_ADMIN]: [
    "tenant:manage",
    "subscription:read",
    "subscription:manage",
  ],
  [ROLES.ADMIN]: [
    "member:read", "member:write", "member:view-credentials", "plan:write", "payment:create", "payment:read",
    "payment:reverse", "receipt:reprint", "expense:create", "expense:approve",
    "report:read", "export:data", "settings:write", "staff:manage", "audit:read",
  ],
  [ROLES.COLLECTOR]: [
    "member:read", "member:write", "payment:create", "payment:read",
    "receipt:reprint", "expense:create", "report:read",
  ],
  [ROLES.AUDITOR]: ["member:read", "payment:read", "report:read", "audit:read"],
  [ROLES.MEMBER]: [],
};

export function can(role: Role | string, permission: Permission): boolean {
  return (MATRIX[role as Role] ?? []).includes(permission);
}

export function assertCan(role: Role | string, permission: Permission): void {
  if (!can(role, permission)) throw new Error("FORBIDDEN");
}
