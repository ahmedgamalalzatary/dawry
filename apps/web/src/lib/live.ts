"use client";

import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import { api } from "./api/client";

/**
 * Refetch on SSE connect, reconnect and change, with polling as a fallback.
 */
export function useLive<T>(url: string, initial: T, eventsUrl: string | null) {
  const [data, setSnapshot] = useState(initial);
  const revision = useRef(0);
  const setData = useCallback((value: SetStateAction<T>) => {
    revision.current++;
    setSnapshot(value);
  }, []);

  const refresh = useCallback(async () => {
    const started = ++revision.current;
    try {
      const snapshot = await api<T>(url);
      if (started === revision.current) setSnapshot(snapshot);
    } catch {
      // Keep showing the last good data; the next event or tick retries.
    }
  }, [url]);

  useEffect(() => {
    if (!eventsUrl) return;
    const source = new EventSource(eventsUrl);
    source.addEventListener("ready", refresh);
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
