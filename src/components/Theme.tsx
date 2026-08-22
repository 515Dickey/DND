"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

export type ThemeName = "day" | "candle";
const KEY = "parchment.theme";

// useLayoutEffect has no meaning during prerender; fall back to useEffect there
// to avoid React's server warning.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const ThemeContext = createContext<{
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}>({ theme: "day", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>("day");

  // Runs before paint. Also re-applies the attribute after React's development
  // remount, which resets attributes on <html> that it doesn't own.
  useIsomorphicLayoutEffect(() => {
    let stored: ThemeName | null = null;
    try {
      stored = window.localStorage.getItem(KEY) as ThemeName | null;
    } catch {
      // Private browsing with storage blocked -- stay on the default.
    }
    const next: ThemeName = stored === "candle" ? "candle" : "day";
    setThemeState(next);
    document.documentElement.dataset.theme = next;
  }, []);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    document.documentElement.dataset.theme = t;
    try {
      window.localStorage.setItem(KEY, t);
    } catch {
      // The choice still applies for this session.
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "day" ? "candle" : "day";
  return (
    <button
      type="button"
      className="btn btn-icon"
      onClick={() => setTheme(next)}
      title={next === "candle" ? "Dim for night play" : "Back to daylight"}
      aria-label={next === "candle" ? "Switch to candlelight" : "Switch to daylight"}
    >
      {/*
        Selune's crescent to go dark, Lathander's dawn to come back -- the moon
        and the sun, so the button still says what it does to anyone who has
        never heard of either. 32px, not the 20px an icon button usually gets:
        both symbols carry a ring around their motif, and three levels of detail
        will not fit in twenty pixels. Tested; at 20px they are grey smudges.
      */}
      <span
        className={`deity ${theme === "day" ? "deity-selune" : "deity-lathander"} block size-8`}
        aria-hidden="true"
      />
    </button>
  );
}

/**
 * Applies the saved theme before first paint so the page never flashes the
 * bright palette at someone who chose candlelight.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("${KEY}");if(t==="candle"||t==="day"){document.documentElement.dataset.theme=t;}}catch(e){}})();`;
