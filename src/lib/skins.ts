/**
 * Interfaces ("skins") are alternate token sets for the same components.
 *
 * A skin is applied by setting `data-skin` on `<html>`; every value below has a
 * matching `[data-skin="…"]` block in `src/app/globals.css` that rebinds the
 * semantic tokens (`--background`, `--primary`, …). Components never branch on
 * the active skin. The light/dark axis stays orthogonal and is still owned by
 * next-themes.
 */

export const SKINS = ["default", "ember"] as const

export type Skin = (typeof SKINS)[number]

export const DEFAULT_SKIN: Skin = "default"

/** Per-device preference; nothing about the interface reaches the server. */
export const SKIN_STORAGE_KEY = "khatbar-interface"

export const SKIN_ATTRIBUTE = "data-skin"

export type SkinMeta = {
  id: Skin
  name: string
  tagline: string
  /** Three representative colours, shown as a preview in Settings. */
  swatches: [string, string, string]
}

export const SKIN_LIST: readonly SkinMeta[] = [
  {
    id: "default",
    name: "Aurora",
    tagline: "Neutral surfaces with a violet accent",
    swatches: ["#18181b", "#7c5cff", "#f4f4f5"],
  },
  {
    id: "ember",
    name: "Ember",
    tagline: "Warm signal in the dark: ink surfaces, copper accent",
    swatches: ["#0f1614", "#e8703a", "#e4ede8"],
  },
]

export function isSkin(value: unknown): value is Skin {
  return typeof value === "string" && (SKINS as readonly string[]).includes(value)
}

export function resolveSkin(value: unknown): Skin {
  return isSkin(value) ? value : DEFAULT_SKIN
}
