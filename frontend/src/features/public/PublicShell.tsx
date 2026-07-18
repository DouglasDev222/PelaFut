import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Lock } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"

/**
 * Layout for the open pages: no bottom nav, no auth, nothing that links back
 * into the private app.
 */
export function PublicShell({
  codigo,
  titulo,
  showBack = true,
  children,
}: {
  codigo: string
  titulo?: string | null
  /** Inner pages get a back arrow to the public home; the home itself doesn't. */
  showBack?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header
        className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-1 border-b bg-background/95 px-2 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {showBack && (
          <Link
            to={`/pelada/${codigo}`}
            aria-label="Voltar para as peladas"
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted"
          >
            <ArrowLeft className="size-5" />
          </Link>
        )}
        <Link to={`/pelada/${codigo}`} className={cn("truncate font-semibold", !showBack && "px-2")}>
          {titulo?.trim() || "Estatísticas"}
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">{children}</main>
      <footer className="border-t px-4 py-3 text-center text-xs text-muted-foreground">
        feito com PelaFut
      </footer>
    </div>
  )
}

/**
 * Shown for an unknown code and for a page that's turned off — deliberately
 * the same message, so it never confirms whether a code exists.
 */
export function PublicNotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6">
      <EmptyState
        icon={Lock}
        title="Página não encontrada"
        description="Esse link não existe ou as estatísticas não estão públicas."
      />
    </div>
  )
}
