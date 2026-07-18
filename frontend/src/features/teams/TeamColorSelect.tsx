import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PICKER_COLORS } from "@/features/teams/teamColors"

/** Compact color dropdown used in the setup screen and on the teams board. */
export function TeamColorSelect({
  value,
  onChange,
  size = "default",
  className,
}: {
  value: string
  onChange: (hex: string) => void
  size?: "sm" | "default"
  className?: string
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as string)}>
      <SelectTrigger size={size} className={className}>
        <SelectValue>
          {(hex: string) => {
            const selected = PICKER_COLORS.find((c) => c.hex === hex)
            return (
              <>
                <span
                  className="inline-block size-4 shrink-0 rounded-full border"
                  style={{ backgroundColor: hex }}
                />
                {selected?.name ?? "Cor"}
              </>
            )
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {PICKER_COLORS.map((c) => (
          <SelectItem key={c.hex} value={c.hex}>
            <span className="inline-block size-4 shrink-0 rounded-full border" style={{ backgroundColor: c.hex }} />
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
