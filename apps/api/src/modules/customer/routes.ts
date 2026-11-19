import { customerSignUpSchema } from "@dawry/shared";
import { fromNodeHeaders } from "better-auth/node";
import { Router } from "express";
import type { Deps } from "../../deps";
import { openStream } from "../../http/events";
import { requireLogin, requireUser } from "../../http/guards";
import { parse } from "../../http/validate";
import * as service from "./service";

/** Mounted at /api/customer. */
export function customerRoutes(deps: Deps) {
  const router = Router();

  router.post("/sign-up", async (req, res) => {
    const input = parse(customerSignUpSchema, req.body);
    await service.signUp(deps, input);

    // Sign the new customer in and pass Better Auth's session cookie through.
    const response = await deps.auth.api.signInUsername({
      body: { username: input.phone, password: input.password },
      headers: fromNodeHeaders(req.headers),
      asResponse: true,
    });
    for (const cookie of response.headers.getSetCookie()) res.append("Set-Cookie", cookie);
    res.status(201).json({ ok: true });
  });

  return router;
}

/** Any logged-in user. Mounted at /api/me. */
export function meRoutes(deps: Deps) {
  const { db } = deps;
  const router = Router();
  router.use(requireLogin);

  router.get("/", async (_req, res) => {
    res.json(await service.me(db, requireUser(res)));
  });

  router.get("/orders", async (_req, res) => {
    res.json(await service.savedOrders(deps, requireUser(res).id));
  });

  router.delete("/orders/:slug/:day/:invoice", async (req, res) => {
    const { slug, day, invoice } = req.params;
    await service.forgetOrder(db, requireUser(res).id, String(slug), String(day), String(invoice));
    res.status(204).end();
  });

  router.get("/events", (req, res) => {
    const userId = requireUser(res).id;
    openStream(req, res, deps.bus, async (restaurantId) =>
      (await service.activeSavedRestaurantIds(db, userId)).has(restaurantId),
    );
  });

  router.get("/favorites", async (_req, res) => {
    res.json(await service.favorites(db, requireUser(res).id));
  });

  router.put("/favorites/:slug", async (req, res) => {
    await service.addFavorite(db, requireUser(res).id, String(req.params.slug));
    res.status(204).end();
  });

  router.delete("/favorites/:slug", async (req, res) => {
    await service.removeFavorite(db, requireUser(res).id, String(req.params.slug));
    res.status(204).end();
  });

  return router;
}
