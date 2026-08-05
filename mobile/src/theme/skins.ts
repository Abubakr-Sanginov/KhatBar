/**
 * Interface metadata for the mobile Appearance settings.
 *
 * Mirrors `src/lib/skins.ts` on the web so both platforms offer the same two
 * interfaces under the same names.
 */

import type { SkinId } from "./colors";

export interface SkinMeta {
  id: SkinId;
  name: string;
  tagline: string;
  /** Three representative colours, shown as a preview in Settings. */
  swatches: [string, string, string];
}

export const SKIN_LIST: SkinMeta[] = [
  {
    id: "default",
    name: "Aurora",
    tagline: "Neutral surfaces with a blue accent",
    swatches: ["#1C1C1E", "#0A84FF", "#F2F2F7"],
  },
  {
    id: "ember",
    name: "Ember",
    tagline: "Warm signal in the dark: ink surfaces, copper accent",
    swatches: ["#0f1614", "#e8703a", "#e4ede8"],
  },
];

export function isSkinId(value: unknown): value is SkinId {
  return value === "default" || value === "ember";
}
