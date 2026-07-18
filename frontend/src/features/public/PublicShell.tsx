import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { Lock } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"

/**
 * Layout for the open pages: no bottom nav, no auth, nothing that links back
 * into the private app.
 */
export function PublicShell({
  codigo,
  titulo,
  children,
}: {
  codigo: string
  titulo?: string | null
  children: ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header
        className="sticky top-0 z-40 flex h-14 shrink-0 items-center border-b bg-background/95 px-4 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <Link to={`/pelada/${codigo}`} className="truncate font-semibold">
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
