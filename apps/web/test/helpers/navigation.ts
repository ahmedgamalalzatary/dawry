import { useSyncExternalStore } from "react";
import { vi } from "vitest";

/**
 * A stand-in for `next/navigation` whose search params live in jsdom's URL, so
 * list search, filters and sorting (kept in the URL) work in component tests.
 * Use with `vi.mock("next/navigation", () => import("./helpers/navigation"))`.
 */
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function go(url: string) {
  window.history.replaceState(null, "", url);
  for (const listener of listeners) listener();
}

export function usePathname() {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

export function useSearchParams() {
  return new URLSearchParams(useSyncExternalStore(subscribe, () => window.location.search));
}

const router = { replace: go, push: go, refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() };
export function useRouter() {
  return router;
}

/** Start each test at a clean URL. */
export function resetUrl(path = "/") {
  go(path);
}
