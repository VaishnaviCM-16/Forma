import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeId =
  | "violet"
  | "night-sky"
  | "obsidian"
  | "aurora"
  | "forest"
  | "ember"
  | "paper"
  | "shinobi-ember"
  | "crimson-moon";
export type TextScale = "comfortable" | "large" | "extra-large";
export const THEMES: {
  id: ThemeId;
  label: string;
  description: string;
  canvas: string;
  grid: string;
  accent: string;
  panel: string;
  text: string;
  background?: string;
  backgroundOpacity?: number;
}[] = [
  {
    id: "violet",
    label: "Electric violet",
    description: "FORMA signature purple",
    canvas: "#101014",
    grid: "rgba(178,154,255,.26)",
    accent: "#b29aff",
    panel: "#111115",
    text: "#f2f0f5",
  },
  {
    id: "night-sky",
    label: "Night sky",
    description: "Deep blue with stars",
    canvas: "#071522",
    grid: "rgba(108,184,233,.29)",
    accent: "#6cb8e9",
    panel: "#0c1b2b",
    text: "#edf6fc",
    background: "/themes/night-sky.webp",
    backgroundOpacity: 0.28,
  },
  {
    id: "obsidian",
    label: "Obsidian",
    description: "Near-black and silver",
    canvas: "#080a0d",
    grid: "rgba(180,195,205,.2)",
    accent: "#9cb1bf",
    panel: "#10141a",
    text: "#f0f3f5",
  },
  {
    id: "aurora",
    label: "Aurora",
    description: "Teal and northern light",
    canvas: "#071411",
    grid: "rgba(80,204,175,.25)",
    accent: "#57d0b4",
    panel: "#0c1c17",
    text: "#effbf7",
  },
  {
    id: "forest",
    label: "Forest",
    description: "Pine and leaf green",
    canvas: "#0c1510",
    grid: "rgba(116,186,124,.24)",
    accent: "#83c685",
    panel: "#101d15",
    text: "#f0f8ef",
  },
  {
    id: "ember",
    label: "Ember",
    description: "Warm copper and graphite",
    canvas: "#17110f",
    grid: "rgba(235,153,109,.25)",
    accent: "#e59a6d",
    panel: "#1c1512",
    text: "#fff4ed",
  },
  {
    id: "paper",
    label: "Paper",
    description: "Warm, bright and quiet",
    canvas: "#ece9e0",
    grid: "rgba(78,73,66,.20)",
    accent: "#7052bd",
    panel: "#f5f2e9",
    text: "#242128",
  },
  {
    id: "shinobi-ember",
    label: "Naruto-inspired",
    description:
      "Original ember and blue shinobi background; no character art or logos",
    canvas: "#111018",
    grid: "rgba(76,151,218,.28)",
    accent: "#ee7942",
    panel: "#171923",
    text: "#fff4e7",
    background: "/themes/shinobi-ember.svg",
    backgroundOpacity: 0.5,
  },
  {
    id: "crimson-moon",
    label: "Demon Slayer",
    description: "Original crimson moon-and-wave background; no character art or logos",
    canvas: "#140d12",
    grid: "rgba(221,74,99,.27)",
    accent: "#e05b71",
    panel: "#1d1118",
    text: "#fff0ed",
    background: "/themes/crimson-moon.svg",
    backgroundOpacity: 0.48,
  },
];
const SIZES: { id: TextScale; label: string; scale: number }[] = [
  { id: "comfortable", label: "Comfortable", scale: 1 },
  { id: "large", label: "Large", scale: 1.12 },
  { id: "extra-large", label: "Extra large", scale: 1.24 },
];
interface ThemeState {
  theme: ThemeId;
  textScale: TextScale;
  setTheme: (id: ThemeId) => void;
  setTextScale: (id: TextScale) => void;
}
const Context = createContext<ThemeState | null>(null);
function stored(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function isTheme(value: string): value is ThemeId {
  return THEMES.some((item) => item.id === value);
}
function isTextScale(value: string): value is TextScale {
  return SIZES.some((item) => item.id === value);
}
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const value = stored("forma.theme", "violet");
    return isTheme(value) ? value : "violet";
  });
  const [textScale, setScaleState] = useState<TextScale>(() => {
    const value = stored("forma.textScale", "comfortable");
    return isTextScale(value) ? value : "comfortable";
  });
  useEffect(() => {
    const selected = THEMES.find((item) => item.id === theme) ?? THEMES[0];
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.textScale = textScale;
    root.style.setProperty("--canvas-bg", selected.canvas);
    root.style.setProperty("--canvas-grid", selected.grid);
    root.style.setProperty("--canvas-accent", selected.accent);
    root.style.setProperty("--canvas-panel", selected.panel);
    root.style.setProperty(
      "--canvas-background-image",
      selected.background ? `url("${selected.background}")` : "none",
    );
    root.style.setProperty(
      "--canvas-background-opacity",
      String(selected.backgroundOpacity ?? 0.28),
    );
    root.style.setProperty(
      "--font-scale",
      String(SIZES.find((item) => item.id === textScale)?.scale ?? 1),
    );
    try {
      localStorage.setItem("forma.theme", theme);
      localStorage.setItem("forma.textScale", textScale);
    } catch {
      /* appearance still works without storage */
    }
    window.dispatchEvent(new Event("forma-theme-change"));
  }, [theme, textScale]);
  const setTheme = useCallback((id: ThemeId) => setThemeState(id), []);
  const setTextScale = useCallback((id: TextScale) => setScaleState(id), []);
  const value = useMemo(
    () => ({ theme, textScale, setTheme, setTextScale }),
    [theme, textScale, setTheme, setTextScale],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useTheme() {
  const value = useContext(Context);
  if (!value) throw new Error("ThemeProvider is missing.");
  return value;
}
