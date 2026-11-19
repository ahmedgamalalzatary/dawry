import { businessDay, type RestaurantReport } from "@dawry/shared";
import type { Db } from "../../db/client";
import type { Clock } from "../orders/helpers";
import { summarise } from "./helpers";
import * as repo from "./repo";

export const REPORT_DAYS = 30;

export async function report(db: Db, restaurantId: string, clock: Clock): Promise<RestaurantReport> {
  const from = businessDay(
    new Date(clock.now().getTime() - (REPORT_DAYS - 1) * 24 * 60 * 60 * 1000),
    clock.timeZone,
  );
  return { days: summarise(await repo.ordersSince(db, restaurantId, from)) };
}
