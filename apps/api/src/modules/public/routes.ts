import { Router } from "express";
import type { Deps } from "../../deps";
import { notFound } from "../../http/errors";
import { openStream } from "../../http/events";
import { currentUser } from "../../http/guards";
import * as service from "./service";

/** Anyone. Mounted at /api/public. */
export function publicRoutes(deps: Deps) {
  const { db } = deps;
  const router = Router();

  router.get("/restaurants", async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    res.json(await service.searchRestaurants(db, q));
  });

  router.get("/r/:slug", async (req, res) => {
    const restaurant = await service.findRestaurant(db, String(req.params.slug));
    if (!restaurant) throw notFound();
    const { slug, name, logoUrl, phone } = restaurant; // never expose the internal id
    res.json({ slug, name, logoUrl, phone });
  });

  router.get("/r/:slug/orders/:invoice", async (req, res) => {
    const order = await service.lookupOrder(
      deps,
      String(req.params.slug),
      String(req.params.invoice).trim(),
      currentUser(res)?.id ?? null,
    );
    if (!order) throw notFound("Order not found");
    res.set("Cache-Control", "no-store").json(order);
  });

  router.get("/r/:slug/events", async (req, res) => {
    const restaurant = await service.findRestaurant(db, String(req.params.slug));
    if (!restaurant) throw notFound();
    openStream(req, res, deps.bus, (changedId) => changedId === restaurant.id);
  });

  return router;
}
