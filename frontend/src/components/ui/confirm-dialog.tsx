import { Button } from "@/components/ui/button"
import { Dialog, DialogPopup, DialogTitle } from "@/components/ui/dialog"

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant = "default",
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  confirmVariant?: "default" | "destructive"
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup>
        <DialogTitle>{title}</DialogTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex flex-col gap-2">
          <Button size="touch" variant={confirmVariant} className="w-full" onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button size="touch" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogPopup>
    </Dialog>
  )
}
