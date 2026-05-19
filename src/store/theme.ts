import { create } from "zustand";

import { safeStorage } from "@/utils/storage";

type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const KEY = "lexitrain.theme";

const apply = (t: Theme) => {
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", t === "dark");
  }
};

const initialTheme = (): Theme => {
  const saved = safeStorage.getItem(KEY);
  if (saved === "dark" || saved === "light") return saved;
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "dark";
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme(),
  toggle: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    apply(next);
    safeStorage.setItem(KEY, next);
    set({ theme: next });
  },
  setTheme: (t) => {
    apply(t);
    safeStorage.setItem(KEY, t);
    set({ theme: t });
  },
}));
