import { useEffect } from "react";

/**
 * Automatically applies the `.dark` class to <html> based on the user's
 * system preference (prefers-color-scheme media query). Re-evaluates live
 * when the OS theme changes.
 */
export default function useSystemDarkMode() {
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (isDark) => {
      document.documentElement.classList.toggle("dark", isDark);
    };
    apply(mql.matches);
    const handler = (e) => apply(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
}