import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

export function StarRating({
  value,
  onChange,
}: {
  value: number | null
  onChange: (value: number | null) => void
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
          onClick={() => onChange(value === star ? null : star)}
        >
          <Star
            className={cn(
              "size-5",
              value && star <= value ? "fill-primary text-primary" : "text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  )
}
