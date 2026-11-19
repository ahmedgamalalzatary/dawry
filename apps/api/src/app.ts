import { toNodeHandler } from "better-auth/node";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import type { Deps } from "./deps";
import { errorHandler, HttpError, notFoundHandler } from "./http/errors";
import { loadSession, requireRestaurant } from "./http/guards";
import { requireTrustedOrigin } from "./http/origin";
import { adminRoutes } from "./modules/admin/routes";
import { catalogRoutes } from "./modules/catalog/routes";
import { customerRoutes, meRoutes } from "./modules/customer/routes";
import { orderRoutes } from "./modules/orders/routes";
import { publicRoutes } from "./modules/public/routes";
import { reportRoutes } from "./modules/reports/routes";
import { settingsRoutes } from "./modules/settings/routes";
import { staffRoutes } from "./modules/staff/routes";

function limiter(enabled: boolean, limit: number) {
  if (!enabled) return (_req: express.Request, _res: express.Response, next: express.NextFunction) => next();
  return rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new HttpError("rate_limited", "Too many requests")),
  });
}

export function createApp(deps: Deps) {
  const app = express();

  // Behind nginx and the Next.js proxy: trust private-network hops for the client IP.
  app.set("trust proxy", "loopback, uniquelocal");
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
      },
      crossOriginResourcePolicy: { policy: "same-origin" },
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // CSRF: every state-changing /api request (auth included) must come from the web origin.
  // Better Auth alone only checks the origin when a cookie is present.
  app.use("/api", requireTrustedOrigin(deps.webOrigin));

  // Better Auth reads the raw body itself, so it goes before express.json().
  app.all("/api/auth/{*splat}", toNodeHandler(deps.auth));

  app.use(express.json({ limit: "100kb" }));
  app.use("/api", loadSession(deps.auth));

  app.use("/api/admin", adminRoutes(deps));
  // Restaurant workspace: membership is loaded once; owner-only routes add requireOwner.
  app.use(
    "/api/restaurant",
    requireRestaurant(deps.db),
    orderRoutes(deps),
    staffRoutes(deps),
    catalogRoutes(deps),
    settingsRoutes(deps),
    reportRoutes(deps),
  );
  app.use("/api/public", limiter(deps.rateLimit, 120), publicRoutes(deps));
  app.use("/api/customer", limiter(deps.rateLimit, 10), customerRoutes(deps));
  app.use("/api/me", meRoutes(deps));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
