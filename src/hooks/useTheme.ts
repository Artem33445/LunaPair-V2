import { useEffect } from "react";
import type { ThemePreference } from "../types";

export function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && systemDark);
  root.classList.toggle("dark", dark);
  root.dataset.theme = dark ? "dark" : "light";
}

export function useTheme(theme: ThemePreference | undefined) {
  useEffect(() => {
    const preference = theme ?? (localStorage.getItem("lunapair-theme") as ThemePreference | null) ?? "system";
    applyTheme(preference);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(preference);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [theme]);
}
