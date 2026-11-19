"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY as KEY } from "./theme-script";

export type Theme = "light" | "dark";

function read(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  // Follow the device setting while the user has not picked a theme.
  const media = matchMedia("(prefers-color-scheme: dark)");
  const onMedia = () => {
    if (!safeGet()) document.documentElement.classList.toggle("dark", media.matches);
  };
  media.addEventListener("change", onMedia);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onMedia);
  };
}

function safeGet() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** The theme currently on <html>; "light" during server rendering. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read, () => "light" as Theme);
  const setTheme = (next: Theme) => {
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // private mode: the choice lasts for this page only
    }
  };
  return { theme, setTheme };
}
