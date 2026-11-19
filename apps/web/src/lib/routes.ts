import type { Me } from "@dawry/shared";

/** Where each kind of account lands after signing in. */
export function homeFor(me: Pick<Me, "kind">) {
  if (me.kind === "admin") return "/admin";
  if (me.kind === "owner" || me.kind === "staff") return "/dashboard";
  return "/me";
}

/** Each role signs in on its own page. */
export const LOGIN = {
  customer: "/login",
  owner: "/r/admin/login",
  staff: "/r/staff/login",
  admin: "/super-admin",
} as const satisfies Record<Me["kind"], string>;

export type Portal = keyof typeof LOGIN;

export const orderPath = (slug: string, invoice: string, day?: string) =>
  `/r/${encodeURIComponent(slug)}/${encodeURIComponent(invoice)}${day ? `?day=${encodeURIComponent(day)}` : ""}`;
