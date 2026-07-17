import { useEffect, useRef, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * A button that only fires after being held down for `holdMs` — the visible
 * fill sweeping across it IS the confirmation, so there's no separate "are
 * you sure?" step to misread or tap through by reflex.
 */
export function HoldToConfirmButton({
  children,
  holdingLabel = "Segure...",
  holdMs = 2000,
  variant,
  className,
  disabled,
  onConfirm,
}: {
  children: ReactNode
  holdingLabel?: string
  holdMs?: number
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "success"
  className?: string
  disabled?: boolean
  onConfirm: () => void
}) {
  const [progress, setProgress] = useState(0)
  const [holding, setHolding] = useState(false)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  function cancelHold() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    startRef.current = null
    setHolding(false)
    setProgress(0)
  }

  function startHold() {
    if (disabled) return
    setHolding(true)
    startRef.current = Date.now()
    // requestAnimationFrame only drives *how often* to check — the actual
    // progress is real wall-clock time (Date.now()), not the rAF timestamp
    // argument, so this can't drift or stall regardless of frame timing.
    const tick = () => {
      const elapsed = Date.now() - (startRef.current ?? Date.now())
      const p = Math.min(1, elapsed / holdMs)
      setProgress(p)
      if (p >= 1) {
        cancelHold()
        onConfirm()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <Button
      type="button"
      variant={variant}
      size="touch"
      disabled={disabled}
      className={cn("relative w-full touch-none overflow-hidden select-none", className)}
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-white/25"
        style={{ width: `${progress * 100}%`, transition: holding ? "none" : "width 150ms ease-out" }}
      />
      <span className="relative">{holding ? holdingLabel : children}</span>
    </Button>
  )
}
