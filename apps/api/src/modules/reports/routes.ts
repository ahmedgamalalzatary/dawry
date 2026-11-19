import { Router } from "express";
import type { Deps } from "../../deps";
import { currentRestaurant, requireOwner } from "../../http/guards";
import * as service from "./service";

/** Owner only. Mounted inside the restaurant router. */
export function reportRoutes(deps: Deps) {
  const router = Router();

  router.get("/reports", requireOwner, async (_req, res) => {
    res.json(await service.report(deps.db, currentRestaurant(res).id, deps));
  });

  return router;
}
