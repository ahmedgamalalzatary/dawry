import type { RequestHandler } from "express";
import { forbidden } from "./errors";

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF guard: state-changing requests must come from the web origin.
 * Browsers always send Origin on cross-site POSTs; Referer is the fallback.
 */
export function requireTrustedOrigin(webOrigin: string): RequestHandler {
  return (req, _res, next) => {
    if (SAFE.has(req.method)) return next();
    const origin = req.get("origin") ?? originOf(req.get("referer"));
    if (origin !== webOrigin) return next(forbidden("Untrusted origin"));
    next();
  };
}

function originOf(url: string | undefined) {
  if (!url) return undefined;
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}
