import type { Me } from "@dawry/shared";

/** Where each kind of account lands after signing in. */
export function homeFor(me: Pick<Me, "kind">) {
  if (me.kind === "admin") return "/admin";
  if (me.kind === "owner" || me.kind === "staff") return "/dashboard";
  return "/me";
}

export const orderPath = (slug: string, invoice: string, day?: string) =>
  `/r/${encodeURIComponent(slug)}/${encodeURIComponent(invoice)}${day ? `?day=${encodeURIComponent(day)}` : ""}`;
