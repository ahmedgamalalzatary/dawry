import "server-only";
import type { Me } from "@dawry/shared";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { homeFor, LOGIN } from "../routes";

const API = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

/** Server-side GET to the API with the visitor's cookies. Returns null on 401/404. */
export async function serverGet<T>(path: string): Promise<T | null> {
  const incoming = await headers();
  const res = await fetch(`${API}${path}`, {
    headers: {
      cookie: incoming.get("cookie") ?? "",
      "x-forwarded-for": incoming.get("x-forwarded-for") ?? "",
    },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403 || res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${path} failed with ${res.status}`);
  return (await res.json()) as T;
}

/** The signed-in account for this request (deduplicated per render). */
export const getMe = cache(() => serverGet<Me>("/api/me"));

/** Redirect to the sign-in page of the first allowed role unless the visitor is one of `kinds`. */
export async function requireKind(...kinds: Me["kind"][]) {
  const me = await getMe();
  if (!me) redirect(LOGIN[kinds[0] ?? "customer"]);
  if (!kinds.includes(me.kind)) redirect(homeFor(me));
  return me;
}
