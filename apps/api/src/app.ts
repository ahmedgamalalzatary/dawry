import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import type { Auth } from "./auth";

export interface AppOptions {
  webOrigin: string;
  auth?: Auth;
}

export function createApp({ webOrigin, auth }: AppOptions) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: webOrigin, credentials: true }));

  // Better Auth reads the raw body itself, so it is mounted before express.json().
  if (auth) app.all("/api/auth/{*splat}", toNodeHandler(auth));

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}
