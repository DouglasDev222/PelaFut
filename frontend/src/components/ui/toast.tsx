import type { ReactNode } from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * A single app-wide manager so any hook/handler can call `toastManager.add(...)`
 * without needing to be inside a component that consumes toast context.
 */
export const toastManager = ToastPrimitive.createToastManager()

const TYPE_BORDER: Record<string, string> = {
  success: "border-success/40",
  error: "border-destructive/40",
  default: "border-border",
}

function Toaster() {
  const { toasts } = ToastPrimitive.useToastManager()
  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport className="fixed inset-x-0 bottom-0 z-100 mx-auto flex w-full max-w-md flex-col-reverse gap-2 p-4 sm:bottom-4">
        {toasts.map((toast) => (
          <ToastPrimitive.Root
            key={toast.id}
            toast={toast}
            className={cn(
              "pointer-events-auto flex items-center justify-between gap-3 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg transition-all duration-200",
              "data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
              TYPE_BORDER[toast.type ?? "default"]
            )}
          >
            <div className="flex flex-col gap-0.5">
              <ToastPrimitive.Title className="text-sm font-medium" />
              <ToastPrimitive.Description className="text-xs text-muted-foreground" />
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {toast.actionProps && (
                <ToastPrimitive.Action
                  {...toast.actionProps}
                  className="text-xs font-semibold text-primary"
                />
              )}
              <ToastPrimitive.Close aria-label="Fechar" className="text-muted-foreground">
                <X className="size-4" />
              </ToastPrimitive.Close>
            </div>
          </ToastPrimitive.Root>
        ))}
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <ToastPrimitive.Provider toastManager={toastManager}>
      {children}
      <Toaster />
    </ToastPrimitive.Provider>
  )
}
