import cors from "cors";
import express from "express";
import helmet from "helmet";

export interface AppOptions {
  webOrigin: string;
}

export function createApp({ webOrigin }: AppOptions) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: webOrigin, credentials: true }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}
