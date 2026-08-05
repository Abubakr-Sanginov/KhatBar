"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"
import {
  DEFAULT_SKIN,
  SKIN_ATTRIBUTE,
  SKIN_STORAGE_KEY,
  resolveSkin,
  type Skin,
} from "@/lib/skins"

/**
 * The `data-skin` attribute on `<html>` is the source of truth for the active
 * interface: CSS reads it, the pre-hydration script writes it before the first
 * paint, and this hook subscribes to it. Keeping the attribute authoritative
 * means no React state can disagree with what is on screen.
 */

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // A switch in another tab should follow here too.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== SKIN_STORAGE_KEY) return
    document.documentElement.setAttribute(SKIN_ATTRIBUTE, resolveSkin(event.newValue))
    emit()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

function getSnapshot(): Skin {
  return resolveSkin(document.documentElement.getAttribute(SKIN_ATTRIBUTE))
}

function getServerSnapshot(): Skin {
  return DEFAULT_SKIN
}

/**
 * Runs before hydration so the first paint already carries the stored
 * interface — otherwise the default tokens flash for a frame.
 */
export const skinScript = `(function(){try{var s=localStorage.getItem("${SKIN_STORAGE_KEY}");if(s==="default"||s==="ember"){document.documentElement.setAttribute("${SKIN_ATTRIBUTE}",s)}else{document.documentElement.setAttribute("${SKIN_ATTRIBUTE}","${DEFAULT_SKIN}")}}catch(e){}})()`

export function useSkin() {
  const skin = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setSkin = useCallback((next: Skin) => {
    document.documentElement.setAttribute(SKIN_ATTRIBUTE, next)
    try {
      localStorage.setItem(SKIN_STORAGE_KEY, next)
    } catch {
      // Preference is best-effort; the switch still applies for this session.
    }
    emit()
  }, [])

  return useMemo(() => ({ skin, setSkin }), [skin, setSkin])
}
