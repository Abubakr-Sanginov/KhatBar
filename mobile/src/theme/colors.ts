/**
 * Palettes for both interfaces.
 *
 * `default` (Aurora) is the original iOS-flavoured look; `ember` mirrors the web
 * Ember tokens in `src/app/globals.css` so the two platforms read as one
 * product. Every entry has the same keys, so screens can consume a theme
 * without knowing which interface is active.
 */

export type SkinId = "default" | "ember";
export type ThemeMode = "light" | "dark";

export interface ThemeColors {
  /** Primary body text. */
  text: string;
  /** Secondary/supporting text. */
  textSecondary: string;
  background: string;
  card: string;
  /** One step above `card`: pressed rows, inputs on cards. */
  cardElevated: string;
  border: string;
  tint: string;
  primary: string;
  /** Foreground on top of `primary` fills — not always white. */
  onPrimary: string;
  destructive: string;
  success: string;
  warning: string;
  /** Muted glyphs and placeholders. */
  muted: string;
  inputBg: string;
  overlay: string;
  tabBar: string;
  tabBarBorder: string;
  /** Tinted background for a selected row. */
  selection: string;
  /** Full-bleed media surfaces (the call stage) stay dark in every theme. */
  immersive: string;
  onImmersive: string;
}

const aurora: Record<ThemeMode, ThemeColors> = {
  light: {
    text: "#1C1C1E",
    textSecondary: "#8E8E93",
    background: "#FFFFFF",
    card: "#F2F2F7",
    cardElevated: "#FFFFFF",
    border: "#D1D1D6",
    tint: "#007AFF",
    primary: "#007AFF",
    onPrimary: "#FFFFFF",
    destructive: "#FF3B30",
    success: "#34C759",
    warning: "#FF9500",
    muted: "#8E8E93",
    inputBg: "#E5E5EA",
    overlay: "rgba(0,0,0,0.5)",
    tabBar: "#F2F2F7",
    tabBarBorder: "#D1D1D6",
    selection: "rgba(0,122,255,0.10)",
    immersive: "#000000",
    onImmersive: "#FFFFFF",
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#8E8E93",
    background: "#000000",
    card: "#1C1C1E",
    cardElevated: "#2C2C2E",
    border: "#38383A",
    tint: "#0A84FF",
    primary: "#0A84FF",
    onPrimary: "#FFFFFF",
    destructive: "#FF453A",
    success: "#30D158",
    warning: "#FF9F0A",
    muted: "#636366",
    inputBg: "#2C2C2E",
    overlay: "rgba(0,0,0,0.7)",
    tabBar: "#1C1C1E",
    tabBarBorder: "#38383A",
    selection: "rgba(10,132,255,0.10)",
    immersive: "#000000",
    onImmersive: "#FFFFFF",
  },
};

const ember: Record<ThemeMode, ThemeColors> = {
  light: {
    text: "#101a17",
    textSecondary: "#5b6f65",
    background: "#f6f8f6",
    card: "#ffffff",
    cardElevated: "#eef3f0",
    border: "#d5e0da",
    tint: "#c4552a",
    primary: "#c4552a",
    onPrimary: "#fff6f0",
    destructive: "#d8483f",
    success: "#2f8f68",
    warning: "#c4552a",
    muted: "#6e8579",
    inputBg: "#e8eeea",
    overlay: "rgba(16,26,23,0.45)",
    tabBar: "#eef3f0",
    tabBarBorder: "#d5e0da",
    selection: "rgba(196,85,42,0.12)",
    immersive: "#0a0f0e",
    onImmersive: "#f2f7f4",
  },
  dark: {
    text: "#e4ede8",
    textSecondary: "#8ba398",
    background: "#0a0f0e",
    card: "#0f1614",
    cardElevated: "#141d1a",
    border: "#223029",
    tint: "#e8703a",
    primary: "#e8703a",
    onPrimary: "#0a0f0e",
    destructive: "#e0574f",
    success: "#5fd3a3",
    warning: "#f78c56",
    muted: "#6e8579",
    inputBg: "#192421",
    overlay: "rgba(10,15,14,0.75)",
    tabBar: "#0f1614",
    tabBarBorder: "#223029",
    selection: "rgba(232,112,58,0.14)",
    immersive: "#0a0f0e",
    onImmersive: "#f2f7f4",
  },
};

export const Palettes: Record<SkinId, Record<ThemeMode, ThemeColors>> = {
  default: aurora,
  ember,
};
