import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type BaseTheme =
  | "minimal"
  | "amethyst-haze"
  | "catppuccin"
  | "kodama-grove"
  | "cosmic-night"
  | "neo-brutalism"
  | "perpetuity"
  | "tangerine"
  | "claymorphism"
  | "starry-night"
  | "t3-chat"
  | "doom-64";

export const THEME_LABELS: Record<BaseTheme, string> = {
  minimal: "Minimal",
  "amethyst-haze": "Amethyst Haze",
  catppuccin: "Catppuccin",
  "kodama-grove": "Kodama Grove",
  "cosmic-night": "Cosmic Night",
  "neo-brutalism": "Neo Brutalism",
  perpetuity: "Perpetuity",
  tangerine: "Tangerine",
  claymorphism: "Claymorphism",
  "starry-night": "Starry Night",
  "t3-chat": "T3 Chat",
  "doom-64": "Doom 64",
};

const STORAGE_KEY = "hyvmind-base-theme";

interface BaseThemeContextType {
  baseTheme: BaseTheme;
  setBaseTheme: (theme: BaseTheme) => void;
}

const BaseThemeContext = createContext<BaseThemeContextType>({
  baseTheme: "minimal",
  setBaseTheme: () => {},
});

export function BaseThemeProvider({ children }: { children: ReactNode }) {
  const [baseTheme, setBaseThemeState] = useState<BaseTheme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && Object.keys(THEME_LABELS).includes(saved)) {
        return saved as BaseTheme;
      }
    } catch {
      // ignore
    }
    return "minimal";
  });

  const setBaseTheme = (theme: BaseTheme) => {
    setBaseThemeState(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    if (baseTheme === "minimal") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", baseTheme);
    }
  }, [baseTheme]);

  return (
    <BaseThemeContext.Provider value={{ baseTheme, setBaseTheme }}>
      {children}
    </BaseThemeContext.Provider>
  );
}

export function useBaseTheme() {
  return useContext(BaseThemeContext);
}
