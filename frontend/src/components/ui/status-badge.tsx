import { cn } from "@/lib/utils"

export type StatusTone = "neutral" | "info" | "success" | "warning"

const TONE_STYLES: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-primary/15 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
}

export function StatusBadge({
  label,
  tone = "neutral",
  pulse = false,
  className,
}: {
  label: string
  tone?: StatusTone
  pulse?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        TONE_STYLES[tone],
        className
      )}
    >
      {pulse && (
        <span className="relative flex size-1.5 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      )}
      {label}
    </span>
  )
}
