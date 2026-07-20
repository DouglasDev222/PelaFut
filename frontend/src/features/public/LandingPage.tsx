import { Link, Navigate } from "react-router-dom"
import { CalendarDays, ListOrdered, Trophy } from "lucide-react"
import { useAuth } from "@/features/auth/AuthProvider"

const HIGHLIGHTS = [
  {
    Icon: CalendarDays,
    title: "Times em segundos",
    text: "Monte os times por sorteio ou na mão, com elenco, cor e capitão.",
  },
  {
    Icon: ListOrdered,
    title: "Rodízio sem discussão",
    text: "A fila anda sozinha a cada jogo — e você ajusta quando a pelada pedir.",
  },
  {
    Icon: Trophy,
    title: "Números que rendem papo",
    text: "Artilheiro, garçom e histórico de jogos, com página pública para o grupo.",
  },
]

/**
 * The public front door at "/". The app itself lives behind auth, so the root
 * no longer drops a stranger straight onto the login form — it explains what
 * PelaFut is and lets whoever actually has an account go find it.
 */
export function LandingPage() {
  const { session, loading } = useAuth()

  // Someone already signed in landing on the root wants the app, not the pitch.
  if (loading) return null
  if (session) return <Navigate to="/matches" replace />

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 p-4">
        <span className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="size-7" />
          <span className="text-lg font-bold">PelaFut</span>
        </span>
        <Link
          to="/login"
          className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Entrar
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-8">
        <section className="flex flex-col gap-4">
          <h1 className="text-3xl font-extrabold text-balance sm:text-4xl">
            A sua pelada organizada do primeiro time ao último gol.
          </h1>
          <p className="max-w-xl text-base text-muted-foreground">
            Monte os times, controle o rodízio da fila e registre gols e assistências ao vivo — do
            celular, à beira da quadra.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/login"
              className="min-h-11 rounded-xl bg-primary px-5 py-3 text-base font-medium text-primary-foreground hover:opacity-90"
            >
              Entrar
            </Link>
            <Link
              to="/signup"
              className="min-h-11 rounded-xl border px-5 py-3 text-base font-medium hover:bg-muted"
            >
              Criar conta
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {HIGHLIGHTS.map(({ Icon, title, text }) => (
            <div key={title} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
              <Icon className="size-6 text-primary" />
              <h2 className="text-sm font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="mx-auto w-full max-w-3xl px-4 py-6 text-xs text-muted-foreground">
        PelaFut — feito para quem joga toda semana.
      </footer>
    </div>
  )
}
