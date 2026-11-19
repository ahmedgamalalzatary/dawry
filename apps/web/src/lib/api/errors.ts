export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function toApiError(res: Response) {
  const body = (await res.json().catch(() => null)) as {
    error?: { code?: string; message?: string } | string;
    message?: string;
    code?: string;
  } | null;
  const error = typeof body?.error === "object" ? body.error : undefined;
  return new ApiRequestError(
    res.status,
    error?.code ?? body?.code ?? "unknown",
    error?.message ?? body?.message ?? res.statusText,
  );
}
