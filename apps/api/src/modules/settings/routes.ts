import { restaurantSettingsSchema } from "@dawry/shared";
import { Router } from "express";
import type { Deps } from "../../deps";
import { currentRestaurant, requireOwner } from "../../http/guards";
import { parse } from "../../http/validate";
import * as service from "./service";

/** Staff read, owner writes. Mounted inside the restaurant router. */
export function settingsRoutes({ db, bus }: Deps) {
  const router = Router();

  router.get("/settings", async (_req, res) => {
    res.json(await service.getSettings(db, currentRestaurant(res).id));
  });

  router.put("/settings", requireOwner, async (req, res) => {
    const input = parse(restaurantSettingsSchema, req.body);
    const restaurantId = currentRestaurant(res).id;
    const updated = await service.updateSettings(db, restaurantId, input);
    bus.publish(restaurantId); // name/logo show on customer pages
    res.json(updated);
  });

  return router;
}
