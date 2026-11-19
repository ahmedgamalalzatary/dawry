import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import en from "../../translation/en";

/** Render inside next-intl with the English messages. */
export function renderWithIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Africa/Cairo">
      {ui}
    </NextIntlClientProvider>,
  );
}

/** Replace global fetch with a queue of JSON responses; returns the mock. */
export function mockFetch(...responses: { status?: number; body?: unknown }[]) {
  const queue = [...responses];
  const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const next = queue.shift() ?? { status: 200, body: {} };
    const status = next.status ?? 200;
    return new Response(status === 204 ? null : JSON.stringify(next.body ?? {}), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  return {
    calls,
    bodyOf: (i: number) => JSON.parse(String(calls[i]?.init?.body ?? "null")),
  };
}
