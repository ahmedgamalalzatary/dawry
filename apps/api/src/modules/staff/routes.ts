import { createStaffSchema, resetPasswordSchema } from "@dawry/shared";
import { Router } from "express";
import type { Deps } from "../../deps";
import { currentRestaurant, requireOwner } from "../../http/guards";
import { parse } from "../../http/validate";
import * as service from "./service";

/** Owner only. Mounted inside the restaurant router. */
export function staffRoutes({ db, auth }: Deps) {
  const router = Router();

  router.get("/staff", requireOwner, async (_req, res) => {
    res.json(await service.listStaff(db, currentRestaurant(res).id));
  });

  router.post("/staff", requireOwner, async (req, res) => {
    const input = parse(createStaffSchema, req.body);
    res.status(201).json(await service.createStaff(auth, db, currentRestaurant(res).id, input));
  });

  router.delete("/staff/:id", requireOwner, async (req, res) => {
    await service.removeStaff(db, currentRestaurant(res).id, String(req.params.id));
    res.status(204).end();
  });

  router.post("/staff/:id/password", requireOwner, async (req, res) => {
    const { password } = parse(resetPasswordSchema, req.body);
    await service.resetStaffPassword(auth, db, currentRestaurant(res).id, String(req.params.id), password);
    res.status(204).end();
  });

  return router;
}
