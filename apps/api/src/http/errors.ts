import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

export type ErrorCode =
  | "validation_failed"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "internal";

const STATUS: Record<ErrorCode, number> = {
  validation_failed: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  internal: 500,
};

export class HttpError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly issues?: unknown,
  ) {
    super(message);
  }

  get status() {
    return STATUS[this.code];
  }
}

export const notFound = (message = "Not found") => new HttpError("not_found", message);
export const forbidden = (message = "Forbidden") => new HttpError("forbidden", message);
export const conflict = (message: string) => new HttpError("conflict", message);
export const unauthenticated = () => new HttpError("unauthenticated", "Sign in required");

export const notFoundHandler: RequestHandler = (_req, _res, next) => next(notFound());

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) return next(err);

  let error: HttpError;
  if (err instanceof HttpError) error = err;
  else if (err instanceof ZodError) {
    error = new HttpError("validation_failed", "Invalid request", err.issues);
  } else if (err?.type === "entity.parse.failed") {
    error = new HttpError("validation_failed", "Malformed JSON");
  } else if (err?.type === "entity.too.large") {
    error = new HttpError("validation_failed", "Request body too large");
  } else {
    console.error(err);
    error = new HttpError("internal", "Something went wrong");
  }

  res.status(error.status).json({
    error: {
      code: error.code,
      message: error.message,
      ...(error.issues ? { issues: error.issues } : {}),
    },
  });
};
