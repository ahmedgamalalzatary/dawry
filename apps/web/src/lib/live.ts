"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api/client";

/**
 * Keep `initial` fresh: refetch `url` whenever the SSE stream at `eventsUrl`
 * says something changed, and every 30 s as a fallback.
 */
export function useLive<T>(url: string, initial: T, eventsUrl: string | null) {
  const [data, setData] = useState(initial);

  const refresh = useCallback(async () => {
    try {
      setData(await api<T>(url));
    } catch {
      // Keep showing the last good data; the next event or tick retries.
    }
  }, [url]);

  useEffect(() => {
    if (!eventsUrl) return;
    const source = new EventSource(eventsUrl);
    source.addEventListener("change", refresh);
    return () => source.close();
  }, [eventsUrl, refresh]);

  useEffect(() => {
    const timer = setInterval(refresh, 30_000);
    return () => clearInterval(timer);
  }, [refresh]);

  return { data, setData, refresh };
}

/**
 * The current time, ticking every `intervalMs` (for countdowns and lateness).
 * `renderedAt` is the server's render time, so the first client render matches
 * the server HTML exactly (no hydration mismatch).
 */
export function useNow(intervalMs = 1000, renderedAt?: string) {
  const [now, setNow] = useState(() => (renderedAt ? new Date(renderedAt) : new Date()));
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
