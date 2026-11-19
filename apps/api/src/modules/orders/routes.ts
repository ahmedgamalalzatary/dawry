import { createOrderSchema, updateEtaSchema, updateOrderStatusSchema } from "@dawry/shared";
import { Router } from "express";
import type { Deps } from "../../deps";
import { openStream } from "../../http/events";
import { currentRestaurant, requireUser } from "../../http/guards";
import { parse } from "../../http/validate";
import * as service from "./service";

/** Owner + staff. Mounted inside the restaurant router (membership already loaded). */
export function orderRoutes(deps: Deps) {
  const { db, bus } = deps;
  const router = Router();

  router.get("/orders", async (_req, res) => {
    res.json(await service.listOrders(db, currentRestaurant(res).id, deps));
  });

  router.post("/orders", async (req, res) => {
    const input = parse(createOrderSchema, req.body);
    const restaurantId = currentRestaurant(res).id;
    const created = await service.createOrder(db, restaurantId, requireUser(res).id, input, deps);
    bus.publish(restaurantId);
    res.status(201).json(created);
  });

  router.get("/orders/:id", async (req, res) => {
    res.json(await service.getOrder(db, currentRestaurant(res).id, String(req.params.id), deps));
  });

  router.patch("/orders/:id/status", async (req, res) => {
    const { status } = parse(updateOrderStatusSchema, req.body);
    const restaurantId = currentRestaurant(res).id;
    const updated = await service.updateStatus(db, restaurantId, String(req.params.id), status, deps);
    bus.publish(restaurantId);
    res.json(updated);
  });

  router.patch("/orders/:id/eta", async (req, res) => {
    const { eta } = parse(updateEtaSchema, req.body);
    const restaurantId = currentRestaurant(res).id;
    const updated = await service.updateEta(db, restaurantId, String(req.params.id), eta, deps);
    bus.publish(restaurantId);
    res.json(updated);
  });

  router.get("/events", (req, res) => {
    const restaurantId = currentRestaurant(res).id;
    openStream(req, res, bus, (changedId) => changedId === restaurantId);
  });

  return router;
}
