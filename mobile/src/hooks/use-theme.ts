import { useMemo } from "react";
import { useThemeStore } from "../stores/theme-store";
import type { ThemeColors } from "../theme/colors";

/** The palette for the interface and mode currently selected in Settings. */
export function useThemeColors(): ThemeColors {
  return useThemeStore((s) => s.colors);
}

/**
 * Builds a `StyleSheet` from the active palette and rebuilds it only when the
 * palette changes. Screens keep their styles in one factory instead of a
 * module-scope `StyleSheet.create`, which is what makes switching interfaces at
 * runtime possible.
 *
 * Pass a module-scope factory (`makeStyles`) so the reference is stable; an
 * inline one would rebuild the sheet on every render.
 */
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const colors = useThemeColors();
  return useMemo(() => factory(colors), [factory, colors]);
}
