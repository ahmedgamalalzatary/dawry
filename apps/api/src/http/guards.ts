import { fromNodeHeaders } from "better-auth/node";
import type { RequestHandler, Response } from "express";
import type { Auth } from "../auth";
import type { Db } from "../db/client";
import { findMembership } from "../modules/accounts/repo";
import { forbidden, HttpError, unauthenticated } from "./errors";

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  role: string | null;
}

export interface RestaurantContext {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  role: "owner" | "member";
}

type Locals = { user?: SessionUser | null; restaurant?: RestaurantContext };

const locals = (res: Response) => res.locals as Locals;

/** Load the session (if any) once per request. Banned users count as signed out. */
export function loadSession(auth: Auth): RequestHandler {
  return async (req, res, next) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    const u = session?.user as (SessionUser & { banned?: boolean | null }) | undefined;
    locals(res).user =
      u && !u.banned
        ? { id: u.id, name: u.name, username: u.username ?? "", role: u.role ?? null }
        : null;
    next();
  };
}

export function currentUser(res: Response): SessionUser | null {
  return locals(res).user ?? null;
}

export function requireUser(res: Response): SessionUser {
  const user = currentUser(res);
  if (!user) throw unauthenticated();
  return user;
}

export function currentRestaurant(res: Response): RestaurantContext {
  const restaurant = locals(res).restaurant;
  if (!restaurant) throw new HttpError("internal", "Restaurant context missing");
  return restaurant;
}

export const requireLogin: RequestHandler = (_req, res, next) => {
  requireUser(res);
  next();
};

export const requireAdmin: RequestHandler = (_req, res, next) => {
  if (requireUser(res).role !== "admin") throw forbidden();
  next();
};

/** Owner or staff of an active restaurant. The restaurant always comes from the session. */
export function requireRestaurant(db: Db): RequestHandler {
  return async (_req, res, next) => {
    const membership = await findMembership(db, requireUser(res).id);
    if (!membership) throw forbidden("Not a member of a restaurant");
    if (!membership.active) throw forbidden("Restaurant is suspended");
    locals(res).restaurant = membership;
    next();
  };
}

/** Use after requireRestaurant. */
export const requireOwner: RequestHandler = (_req, res, next) => {
  if (currentRestaurant(res).role !== "owner") throw forbidden("Owner only");
  next();
};
