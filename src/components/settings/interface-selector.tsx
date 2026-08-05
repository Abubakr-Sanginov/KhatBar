"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { SKIN_LIST } from "@/lib/skins"
import { useSkin } from "@/hooks/use-skin"

/**
 * Interface picker. Each card previews the skin's surface, accent and text
 * colours, so the choice is visible before it is applied — the switch itself is
 * instant and stored per device.
 */
export function InterfaceSelector() {
  const { skin, setSkin } = useSkin()

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {SKIN_LIST.map((option) => {
        const isActive = option.id === skin
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setSkin(option.id)}
            aria-pressed={isActive}
            className={cn(
              "flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors",
              isActive ? "border-primary bg-accent/60" : "hover:bg-accent/40",
            )}
          >
            <span className="flex items-center gap-2">
              <span className="flex gap-1" aria-hidden="true">
                {option.swatches.map((color) => (
                  <span
                    key={color}
                    className="h-4 w-4 rounded-full border border-border"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
              <span className="flex-1 text-sm font-medium">{option.name}</span>
              {isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </span>
            <span className="text-xs text-muted-foreground">{option.tagline}</span>
          </button>
        )
      })}
    </div>
  )
}
