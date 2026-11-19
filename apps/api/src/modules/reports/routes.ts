import { Router } from "express";
import type { Deps } from "../../deps";
import { currentRestaurant, requireOwner } from "../../http/guards";
import * as service from "./service";

/** Owner only. Mounted inside the restaurant router. */
export function reportRoutes(deps: Deps) {
  const router = Router();

  router.get("/reports", requireOwner, async (req, res) => {
    res.json(await service.report(deps.db, currentRestaurant(res).id, deps, service.parseRange(req.query.days)));
  });

  router.get("/reports/data", requireOwner, async (req, res) => {
    const period = service.parsePeriod(req.query, deps);
    res.json(await service.reportData(deps.db, currentRestaurant(res).id, deps, period));
  });

  return router;
}
