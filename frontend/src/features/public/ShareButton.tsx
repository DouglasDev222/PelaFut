import { useState } from "react"
import { Link } from "react-router-dom"
import { Share2 } from "lucide-react"
import { usePublicLink } from "@/features/public/usePublicLink"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { toastManager } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

/**
 * Shares a public link. Uses the native share sheet when the browser has one
 * (phones), otherwise copies to the clipboard. If the public page is still
 * turned off, explains that instead of handing out a dead link.
 */
export function ShareButton({
  matchId,
  label = "Compartilhar",
  className,
  variant = "outline",
}: {
  /** Share this pelada; omit to share the account's public home. */
  matchId?: string
  label?: string
  className?: string
  variant?: "outline" | "default" | "secondary"
}) {
  const { enabled, loading, matchUrl, homeUrl } = usePublicLink()
  const [offOpen, setOffOpen] = useState(false)

  const url = matchId ? matchUrl(matchId) : homeUrl

  async function share() {
    // No code yet or page turned off -> explain, never share a dead link.
    if (!enabled || !url) {
      setOffOpen(true)
      return
    }
    const shareData = { title: "Estatísticas da pelada", url }
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch {
        // User dismissed the sheet, or the browser refused — fall back to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      toastManager.add({ title: "Link copiado" })
    } catch {
      toastManager.add({ title: "Não consegui copiar o link" })
    }
  }

  if (loading) return null

  return (
    <>
      <Button type="button" variant={variant} size="touch" className={className} onClick={share}>
        <Share2 className="size-4" /> {label}
      </Button>

      <Dialog open={offOpen} onOpenChange={setOffOpen}>
        <DialogPopup className="flex flex-col gap-3">
          <DialogTitle>Página pública desligada</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Para compartilhar as estatísticas, ative a página pública no seu perfil. Só peladas já
            encerradas aparecem lá.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="touch"
              className="flex-1"
              onClick={() => setOffOpen(false)}
            >
              Agora não
            </Button>
            <Link
              to="/profile"
              onClick={() => setOffOpen(false)}
              className={cn(buttonVariants({ size: "touch" }), "flex-1")}
            >
              Ativar no perfil
            </Link>
          </div>
        </DialogPopup>
      </Dialog>
    </>
  )
}
