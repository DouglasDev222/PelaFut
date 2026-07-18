import { useState } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PICKER_COLORS } from "@/features/teams/teamColors"
import { cn } from "@/lib/utils"

/**
 * Compact color picker: the team's color dot itself is the trigger, opening a
 * small grid of color circles (no names). Used on the teams board where space
 * is tight.
 */
export function TeamColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (hex: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        aria-label="Trocar cor do time"
        className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-muted"
      >
        <span
          className="size-5 rounded-full border-2 border-foreground/25"
          style={{ backgroundColor: value }}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={4}>
        <div className="grid grid-cols-4 gap-2 p-1">
          {PICKER_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              aria-label={c.name}
              title={c.name}
              onClick={() => {
                onChange(c.hex)
                setOpen(false)
              }}
              className={cn(
                "size-9 rounded-full border-2 border-foreground/25",
                value === c.hex && "ring-2 ring-primary ring-offset-2 ring-offset-popover"
              )}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
