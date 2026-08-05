import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import { Palettes, type SkinId, type ThemeColors, type ThemeMode } from "../theme/colors";
import { isSkinId } from "../theme/skins";

const SKIN_KEY = "khatbar_interface";
const MODE_KEY = "khatbar_appearance";

/** "system" follows the OS; the other two pin the mode. */
export type ModePreference = ThemeMode | "system";

interface ThemeState {
  skin: SkinId;
  modePreference: ModePreference;
  /** The mode actually in effect once "system" is resolved. */
  mode: ThemeMode;
  colors: ThemeColors;
  /** False until the stored preferences have been read. */
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setSkin: (skin: SkinId) => void;
  setModePreference: (preference: ModePreference) => void;
  /** Called when the OS appearance changes; only matters while on "system". */
  syncSystemMode: (mode: ThemeMode) => void;
}

function systemMode(): ThemeMode {
  return Appearance.getColorScheme() === "light" ? "light" : "dark";
}

function resolve(skin: SkinId, preference: ModePreference, system: ThemeMode) {
  const mode = preference === "system" ? system : preference;
  return { mode, colors: Palettes[skin][mode] };
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  skin: "default",
  modePreference: "dark",
  mode: "dark",
  colors: Palettes.default.dark,
  isHydrated: false,

  hydrate: async () => {
    let skin: SkinId = "default";
    let preference: ModePreference = "dark";
    try {
      const [storedSkin, storedMode] = await Promise.all([
        AsyncStorage.getItem(SKIN_KEY),
        AsyncStorage.getItem(MODE_KEY),
      ]);
      if (isSkinId(storedSkin)) skin = storedSkin;
      if (storedMode === "light" || storedMode === "dark" || storedMode === "system") {
        preference = storedMode;
      }
    } catch {
      // Unreadable storage: fall back to the defaults above.
    }
    set({ skin, modePreference: preference, ...resolve(skin, preference, systemMode()), isHydrated: true });
  },

  setSkin: (skin) => {
    set({ skin, ...resolve(skin, get().modePreference, systemMode()) });
    void AsyncStorage.setItem(SKIN_KEY, skin).catch(() => {});
  },

  setModePreference: (preference) => {
    set({ modePreference: preference, ...resolve(get().skin, preference, systemMode()) });
    void AsyncStorage.setItem(MODE_KEY, preference).catch(() => {});
  },

  syncSystemMode: (mode) => {
    const { skin, modePreference } = get();
    if (modePreference !== "system") return;
    set(resolve(skin, modePreference, mode));
  },
}));
