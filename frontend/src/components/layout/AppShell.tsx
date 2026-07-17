import type { ReactNode } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { ArrowLeft, CalendarDays, User, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const ROOT_TABS = [
  { path: "/matches", label: "Peladas", Icon: CalendarDays },
  { path: "/players", label: "Peladeiros", Icon: Users },
  { path: "/profile", label: "Perfil", Icon: User },
]

const ROOT_PATHS = new Set(["/", ...ROOT_TABS.map((t) => t.path)])

export function AppShell({
  title,
  children,
  headerActions,
  onBack,
}: {
  title: string
  children: ReactNode
  headerActions?: ReactNode
  /** Overrides the default browser-history back — use for a route whose
   * logical "back" isn't just "wherever I came from" (e.g. cancelling a
   * sub-step back to the page's own main view). */
  onBack?: () => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const isRoot = ROOT_PATHS.has(location.pathname)

  return (
    <div className="flex h-svh flex-col bg-background">
      <header
        className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-1 border-b bg-background/95 px-1 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {!isRoot ? (
          <button
            type="button"
            onClick={onBack ?? (() => navigate(-1))}
            aria-label="Voltar"
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted"
          >
            <ArrowLeft className="size-5" />
          </button>
        ) : (
          <div className="size-11 shrink-0" aria-hidden />
        )}
        <h1 className="flex-1 truncate px-1 text-base font-semibold">{title}</h1>
        {headerActions ?? <div className="size-11 shrink-0" aria-hidden />}
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">{children}</div>
      </main>

      {isRoot && (
        <nav
          className="sticky bottom-0 z-40 flex shrink-0 border-t bg-background/95 backdrop-blur"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {ROOT_TABS.map(({ path, label, Icon }) => {
            const active = location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                aria-label={label}
                className={cn(
                  "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors active:bg-muted",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="size-6" />
                {label}
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  )
}
