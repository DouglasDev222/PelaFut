import { StarShape } from "@/features/players/StarsDisplay"
import { fillFor } from "@/features/players/starScale"

/**
 * Star input with half steps. Tapping a star cycles it:
 * empty → half (x.5) → full (x) → cleared. So two taps on the 4th star gives
 * 4, and one tap gives 3.5.
 */
export function StarRating({
  value,
  onChange,
}: {
  value: number | null
  onChange: (value: number | null) => void
}) {
  function cycle(star: number) {
    const half = star - 0.5
    if (value === half) return onChange(star)
    if (value === star) return onChange(null)
    return onChange(half)
  }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
          className="flex size-9 items-center justify-center"
          onClick={() => cycle(star)}
        >
          <StarShape fill={value == null ? "empty" : fillFor(value, star)} size="size-6" />
        </button>
      ))}
      {value != null && (
        <span className="ml-1 text-sm text-muted-foreground tabular-nums">{value}</span>
      )}
    </div>
  )
}
