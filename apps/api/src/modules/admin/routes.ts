import {
  createRestaurantSchema,
  resetPasswordSchema,
  setRestaurantActiveSchema,
} from "@dawry/shared";
import { Router } from "express";
import type { Deps } from "../../deps";
import { requireAdmin } from "../../http/guards";
import { parse } from "../../http/validate";
import * as service from "./service";

/** Super-admin only. Mounted at /api/admin. */
export function adminRoutes(deps: Deps) {
  const { db, auth, bus } = deps;
  const router = Router();
  router.use(requireAdmin);

  router.get("/restaurants", async (_req, res) => {
    res.json(await service.listRestaurants(db, deps));
  });

  router.post("/restaurants", async (req, res) => {
    const input = parse(createRestaurantSchema, req.body);
    res.status(201).json(await service.createRestaurant(auth, db, input));
  });

  router.patch("/restaurants/:id", async (req, res) => {
    const { active } = parse(setRestaurantActiveSchema, req.body);
    const id = String(req.params.id);
    await service.setActive(db, id, active);
    bus.publish(id);
    res.json({ id, active });
  });

  router.post("/users/:id/password", async (req, res) => {
    const { password } = parse(resetPasswordSchema, req.body);
    await service.resetPassword(auth, db, String(req.params.id), password);
    res.status(204).end();
  });

  router.get("/stats", async (_req, res) => {
    res.json(await service.stats(db, deps));
  });

  return router;
}
