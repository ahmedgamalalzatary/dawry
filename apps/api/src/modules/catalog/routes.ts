import { customFieldSchema, menuItemSchema, updateCustomFieldSchema, updateMenuItemSchema } from "@dawry/shared";
import { Router } from "express";
import type { Deps } from "../../deps";
import { currentRestaurant, requireOwner } from "../../http/guards";
import { parse } from "../../http/validate";
import * as service from "./service";

/** Menu items and custom fields: staff read, owner writes. Mounted inside the restaurant router. */
export function catalogRoutes({ db }: Deps) {
  const router = Router();

  router.get("/menu", async (_req, res) => {
    res.json(await service.listMenu(db, currentRestaurant(res).id));
  });

  router.post("/menu", requireOwner, async (req, res) => {
    const input = parse(menuItemSchema, req.body);
    res.status(201).json(await service.createMenuItem(db, currentRestaurant(res).id, input));
  });

  router.patch("/menu/:id", requireOwner, async (req, res) => {
    const input = parse(updateMenuItemSchema, req.body);
    res.json(await service.updateMenuItem(db, currentRestaurant(res).id, String(req.params.id), input));
  });

  router.get("/fields", async (_req, res) => {
    res.json(await service.listFields(db, currentRestaurant(res).id));
  });

  router.post("/fields", requireOwner, async (req, res) => {
    const input = parse(customFieldSchema, req.body);
    res.status(201).json(await service.createField(db, currentRestaurant(res).id, input));
  });

  router.patch("/fields/:id", requireOwner, async (req, res) => {
    const input = parse(updateCustomFieldSchema, req.body);
    res.json(await service.updateField(db, currentRestaurant(res).id, String(req.params.id), input));
  });

  return router;
}
